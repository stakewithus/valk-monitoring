<template>
  <b-container fluid class="pl-0 pr-0 pb-3">
    <h2 class="text-uppercase">{{ $route.path.split("/")[2] }}</h2>
    <b-row class="mt-3">
      <b-col
        cols="12"
        lg="3"
        md="4"
        sm="6"
        v-for="network in networksComputed"
        :key="network.id"
        class="mt-2 mb-2 pl-2 pr-2"
      >
        <network :network="network" />
      </b-col>
    </b-row>
    <v-loading v-if="fetching" :global="true" />
    <div class="mt-5 text-danger text-center w-100" v-if="error">
      {{ error.message || error }}
    </div>
  </b-container>
</template>

<script>
import { mapGetters } from "vuex";
import { Network } from "@/components/Network";
import Config from "../../config";

const projectNameAlt = {
  iov: "starname"
};

export default {
  components: {
    Network
  },
  computed: {
    ...mapGetters({
      networks: "networks/getNetworks",
      chainIds: "networks/latestChainIds"
    }),
    showMainnet() {
      return this.$route.name === "networksMainnet";
    },
    networksComputed() {
      return this.networks
        .map(item => ({
          ...item,
          chainId:
            this.chainIds[
              projectNameAlt[item.projectName.slice(4)] ||
                item.projectName.slice(4)
            ] || item.networkName,
          isMainnet: !!this.chainIds[
            projectNameAlt[item.projectName.slice(4)] ||
              item.projectName.slice(4)
          ]
        }))
        .filter(item => item.isMainnet === this.showMainnet);
    }
  },
  created() {
    this.load();
  },
  watch: {
    $route() {
      this.load();
    }
  },
  data() {
    return {
      fetching: false,
      error: null,
      socket: null
    };
  },
  methods: {
    async load() {
      this.fetching = true;
      try {
        await this.$store.dispatch("networks/getLatestChainIds");
        await this.$store.dispatch("networks/getNetworksInfo");
        this.updateNetworkInfo();
      } catch (error) {
        this.error = error;
      }
      this.fetching = false;
    },
    onMessageEvent(event) {
      if (!event.data) {
        return;
      }
      const eventData = JSON.parse(event.data);
      if (eventData.type === "GLOBAL_STATUS_UPDATE") {
        this.$store.dispatch("networks/liveUpdate", {
          networks: eventData.data
        });
      }
    },
    enableLiveUpdateUsingPolling() {
      this.$store.dispatch("networks/liveUpdateUsingPolling");
    },
    dsiableLiveUpdateUsingPolling() {
      this.$store.dispatch("networks/stopLiveUpdateUsingPolling");
    },
    updateNetworkInfo() {
      try {
        this.socket = new WebSocket(Config.webSocketEndpoint);
        this.socket.onmessage = this.onMessageEvent;
        this.socket.onerror = this.enableLiveUpdateUsingPolling;
        this.socket.onopen = this.dsiableLiveUpdateUsingPolling;
      } catch (e) {
        this.enableLiveUpdateUsingPolling();
      }
    }
  },
  destroyed() {
    if (this.socket) {
      this.socket.close();
    }
    this.dsiableLiveUpdateUsingPolling();
  }
};
</script>
