<template>
  <div>
    <h3>Validator Mapping</h3>
    <br />
    <validator-mapping
      :items="validatorMapping"
      :state="state"
      :onSave="addValidator"
      @onDelete="deleteValidator"
    ></validator-mapping>
  </div>
</template>

<script>
import { mapGetters } from "vuex";
import ValidatorMapping from "@/components/Network/ValidatorMapping";
export default {
  name: "validator-mapping-view",
  components: {
    ValidatorMapping
  },
  data() {
    return {
      state: {
        fetching: false,
        fetchingError: null,
        saving: false,
        savingError: null,
        deleting: false,
        deletingError: null
      }
    };
  },
  computed: {
    ...mapGetters({
      validatorMapping: "networks/getValidatorMapping"
    })
  },
  methods: {
    async fetchData() {
      this.state.fetching = true;
      this.state.fetchingError = null;
      try {
        await this.$store.dispatch("networks/fetchValidatorMapping");
      } catch (error) {
        this.state.fetchingError = error;
      }
      this.state.fetching = false;
    },
    async addValidator(validator) {
      this.state.saving = true;
      this.state.savingError = null;
      try {
        await this.$store.dispatch("networks/addValidator", validator);
      } catch (error) {
        this.state.savingError = error;
        throw error;
      } finally {
        this.state.saving = false;
      }
    },
    async deleteValidator(validator) {
      this.state.deleting = true;
      this.state.deletingError = null;
      try {
        await this.$store.dispatch("networks/deleteValidator", validator);
      } catch (error) {
        this.state.deletingError = error;
      }
      this.state.deleting = false;
    }
  },
  created() {
    this.fetchData();
  }
};
</script>