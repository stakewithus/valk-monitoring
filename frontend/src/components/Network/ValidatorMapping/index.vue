<template>
  <div class="position-relative">
    <b-table
      id="validatorMappingTable"
      :items="items"
      :fields="fields"
      :busy="state.fetching"
      responsive
      bordered
      no-local-sorting
    >
      <template v-slot:table-busy>
        <div class="text-center text-info my-2">
          <b-spinner class="align-middle"></b-spinner>
          <strong>Loading...</strong>
        </div>
      </template>
      <template v-slot:head(validators)="data">
        <div class="text-center p-2">
          <span style="margin-left:-140px">{{data.label}}</span>
        </div>
        <div class="d-flex align-items-center border-top">
          <div class="flex-1 border-right p-2 validator-address">Address</div>
          <div class="flex-1 border-right p-2">Name</div>
          <div class="text-center actions p-2">Actions</div>
        </div>
      </template>
      <template v-slot:cell(validators)="data">
        <div
          v-for="(validator,index) in validatorList[data.item.project]"
          :key="index"
          :class="classNames('d-flex align-items-center validator-item border-bottom')"
        >
          <div class="content d-flex flex-1 border-right">
            <div class="flex-1 p-2 border-right validator-address">
              <span v-if="!validator.isNew">{{validator.address}}</span>
              <b-input
                v-else
                autofocus
                required
                v-model="validator.address"
                placeholder="Validator address(*)"
                size="sm"
              ></b-input>
            </div>
            <div class="flex-1 p-2">
              <span v-if="!validator.isNew">{{validator.name}}</span>
              <b-input
                v-else
                required
                v-model="validator.name"
                placeholder="Validator name(*)"
                size="sm"
              ></b-input>
            </div>
          </div>
          <div class="actions">
            <div class="d-flex justify-content-center" v-if="!validator.isNew">
              <b-button
                variant="outline-secondary ml-1"
                size="sm"
                @click="deleteValidator(data.item.project,validator)"
              >Delete</b-button>
            </div>
            <div class="d-flex justify-content-center" v-else>
              <b-button
                variant="primary"
                size="sm"
                @click="saveValidator(data.item.project,validator)"
              >Save</b-button>
              <b-button
                variant="outline-secondary ml-1"
                size="sm"
                @click="cancelAdding(data.item.project,index)"
              >Cancel</b-button>
            </div>
          </div>
        </div>
        <div class="d-flex validator-item">
          <div class="flex-1"></div>
          <div class="actions d-flex justify-content-center p-2">
            <b-button
              variant="primary"
              size="sm"
              @click="addValidator(data.item.project)"
            >Add validator</b-button>
          </div>
        </div>
      </template>
    </b-table>
    <v-loading v-if="state.saving || state.deleting" />
    <div
      class="mt-3 text-center text-danger"
      v-if="state.fetchingError"
    >Error fetching data: {{state.fetchingError.message || state.fetchingError }}</div>
    <div
      class="mt-3 text-center text-danger"
      v-if="state.savingError"
    >Error saving data: {{state.savingError.message || state.savingError}}</div>
    <div
      class="mt-3 text-center text-danger"
      v-if="state.deletingError"
    >Error deleting data: {{state.deletingError.message || state.deletingError}}</div>
  </div>
</template>
<style>
.actions {
  width: 140px;
}
.project-field {
  width: 250px;
}
.validator-address {
  min-width: 412px;
}
</style>
<script>
export default {
  name: "validator-mapping",
  props: {
    items: {
      type: Array,
      default: []
    },
    state: {
      type: Object,
      default: {}
    },
    onSave: {
      type: Function
    }
  },
  data() {
    return {
      fields: [
        {
          key: "project",
          label: "Project",
          class: "align-middle project-field text-nowrap"
        },
        {
          key: "validators",
          label: "Validators",
          class: "p-0 align-middle"
        }
      ],
      validatorList: {}
    };
  },
  watch: {
    items: {
      immediate: true,
      handler(newItems) {
        if (!newItems) return;
        this.validatorList = newItems.reduce((acc, cur) => {
          acc[cur.project] = cur.validators.map(validator => ({
            ...validator,
            isNew: false
          }));
          if (this.validatorList[cur.project]) {
            acc[cur.project] = acc[cur.project].concat(
              this.validatorList[cur.project].filter(
                validator => validator.isNew
              )
            );
          }
          return acc;
        }, {});
      }
    }
  },
  methods: {
    addValidator(project) {
      this.validatorList[project].push({
        address: "",
        name: "",
        isNew: true
      });
    },
    async saveValidator(project, validator) {
      if (!validator.address) return alert("Validator address is required.");
      if (!validator.name) return alert("Validator name is required.");
      const payload = {
        project,
        network: this.items.find(item => item.project === project).network,
        validator: {
          address: validator.address,
          name: validator.name
        }
      };
      try {
        await this.onSave(payload);
        const removeIdx = this.validatorList[project].indexOf(validator);
        this.validatorList[project].splice(removeIdx, 1);
      } catch (error) {}
    },
    cancelAdding(project, index) {
      this.validatorList[project].splice(index, 1);
    },
    deleteValidator(project, validator) {
      const currentValidatorLength = this.validatorList[project].filter(
        v => !v.isNew
      ).length;
      if (currentValidatorLength === 1)
        return alert("Cannot delete the last validator.");
      const r = window.confirm("Are you sure to delete this validator?");
      r && this.confirmDeleteValidator(project, validator);
    },
    confirmDeleteValidator(project, validator) {
      const payload = {
        project,
        network: this.items.find(item => item.project === project).network,
        validator: {
          address: validator.address,
          name: validator.name
        }
      };
      this.$emit("onDelete", payload);
    }
  }
};
</script>