<template>
  <div>
    <b-table
      id="networkSentryView"
      striped
      hover
      outlined
      no-local-sorting
      responsive
      :fields="fields"
      :items="status"
      :busy="fetching"
    >
      <template v-slot:table-busy>
        <div class="text-center text-info my-2">
          <b-spinner class="align-middle"></b-spinner>
          <strong>Loading...</strong>
        </div>
      </template>
      <template v-slot:cell(host)="data">{{ data.value }}</template>
      <template v-slot:cell(region)="data">{{ data.value }}</template>
      <template v-slot:cell(blockHeight)="data">{{ data.value | number }}</template>
      <template v-slot:cell(catchingUp)="data">
        <span
          v-b-tooltip.hover
          :title="`${data.value?'Catching Up':'Not catching up'}`"
          placement="bottom"
        >
          <font-awesome-icon
            icon="check"
            :class="classNames({'text-success': data.value, 'text-secondary': !data.value})"
          />
        </span>
      </template>
      <template v-slot:cell(peers)="data">
        <div class="text-center">
          <span>{{data.item.peersInbound}}</span>
          <span>/</span>
          <span>{{data.item.peersOutbound}}</span>
        </div>
      </template>
      <template v-slot:cell(checks)="data">
        <div class="d-flex justify-content-center">
          <div
            v-for="check in data.item.healthChecks"
            :id="check.checkId"
            :key="check.checkId"
            :class="`p-3 border ${getClassByStatus(check.status)}`"
          >
            <b-popover :target="check.checkId" triggers="hover" placement="bottom">
              <template v-slot:title>
                {{check.name}} -
                <span class="text-capitalize">{{check.status}}</span>
              </template>
              <div v-html="check.output.slice(0,check.output.indexOf('\n'))"></div>
            </b-popover>
          </div>
        </div>
      </template>
      <template v-slot:cell(actions)="data">
        <div class="d-flex justify-content-end">
          <b-button
            variant="primary"
            size="sm"
            :disabled="Object.values(nodeMuting).some(x=>!!x)"
            @click="muteNode({project: data.item.projectName, region:data.item.region})"
          >
            <b-spinner
              small
              v-if="!!nodeMuting[`${data.item.region}:${getNodeProjectName(data.item.projectName)}`]"
            />
            {{isNodeMuted({project: data.item.projectName, region:data.item.region})?'Unmute':'Mute'}}
          </b-button>
        </div>
      </template>
    </b-table>
  </div>
</template>
<style>
.sentry-actions {
  width: 120px;
}
#networkSentryView td,
#networkSentryView th {
  vertical-align: middle;
}
</style>
<script>
import { library } from "@fortawesome/fontawesome-svg-core";
import { faCheck } from "@fortawesome/free-solid-svg-icons";
library.add(faCheck);

const statusMap = {
  passing: 1,
  warning: 2,
  critical: 3
};

const classMap = {
  passing: "bg-success",
  critical: "bg-danger",
  warning: "bg-warning"
};

export default {
  name: "sentry-table",
  props: {
    nodeStatus: {
      type: Array,
      default: []
    },
    fetching: {
      type: Boolean
    },
    mutedNodes: {
      type: String,
      default: ""
    },
    muteNodes: {
      type: Function
    },
    filteringByProject: {
      type: Boolean,
      default: true
    }
  },
  data() {
    return {
      fieldsWithHosts: [
        { key: "host", label: "Host", sortable: false },
        {
          key: "region",
          label: "Region",
          sortable: false,
          tdClass: "text-nowrap"
        },
        { key: "blockHeight", label: "Block Height", sortable: false },
        {
          key: "catchingUp",
          label: "Catching Up",
          sortable: false,
          class: "text-center"
        },
        {
          key: "peers",
          label: "Peers(Inbound/OutBound)",
          sortable: false,
          class: "text-center"
        },
        {
          key: "checks",
          label: "Checks",
          sortable: false,
          class: "text-center"
        },
        {
          key: "actions",
          label: "Actions",
          sortable: false,
          class: "text-right sentry-actions"
        }
      ],
      fieldsWithProjects: [
        {
          key: "projectName",
          label: "Project",
          sortable: false,
          tdClass: "text-nowrap"
        },
        {
          key: "region",
          label: "Region",
          sortable: false,
          tdClass: "text-nowrap"
        },
        { key: "blockHeight", label: "Block Height", sortable: false },
        {
          key: "catchingUp",
          label: "Catching Up",
          sortable: false,
          class: "text-center"
        },
        {
          key: "peers",
          label: "Peers(Inbound/OutBound)",
          sortable: false,
          class: "text-center"
        },
        {
          key: "checks",
          label: "Checks",
          sortable: false,
          class: "text-center"
        },
        {
          key: "actions",
          label: "Actions",
          sortable: false,
          class: "text-right sentry-actions"
        }
      ],
      nodeMuting: {}
    };
  },
  computed: {
    status() {
      return this.nodeStatus.map(ns => {
        return {
          ...ns,
          healthChecks: ns.healthChecks.sort((a, b) => {
            return statusMap[b.status] - statusMap[a.status];
          })
        };
      });
    },
    fields() {
      return this.filteringByProject
        ? this.fieldsWithHosts
        : this.fieldsWithProjects;
    }
  },
  methods: {
    getClassByStatus(status) {
      return classMap[status] || "";
    },
    getNodeProjectName(project) {
      return project.startsWith("bcl-") ? project.substr(4) : project;
    },
    isNodeMuted({ project, region }) {
      project = this.getNodeProjectName(project);
      return this.mutedNodes.includes(`${region}:${project}`);
    },
    async muteNode({ project, region }) {
      project = this.getNodeProjectName(project);
      const node = `${region}:${project}`;
      this.nodeMuting = {
        ...this.nodeMuting,
        [node]: true
      };
      await this.muteNodes(node, this.isNodeMuted({ project, region }));
      this.nodeMuting[node] = false;
    }
  }
};
</script>