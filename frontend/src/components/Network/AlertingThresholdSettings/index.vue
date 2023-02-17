<template>
  <div class="position-relative">
    <h5>Default settings</h5>
    <default-settings-table
      :rawSettings="settings.defaultSettings"
      :items="defaultSettingList"
      :fields="fields"
      :isBusy="state.fetching"
      :editingItems="editingItems"
      :isEditing="isEditing"
      :editSetting="editSetting"
      :cancelEditing="cancelEditing"
      :updateSetting="updateSetting"
    />
    <br />
    <h5>Custom settings</h5>
    <custom-settings-table
      :rawSettings="settings.customSettings"
      :items="customSettingList"
      :fields="fields"
      :isBusy="state.fetching"
      :editingItems="editingItems"
      :isEditing="isEditing"
      :editSetting="editSetting"
      :cancelEditing="cancelEditing"
      :updateSetting="updateSetting"
    />
    <v-loading v-if="state.updating" />
    <div
      class="mt-3 text-center text-danger"
      v-if="state.fetchingError"
    >{{state.fetchingError.message || state.fetchingError }}</div>
    <div
      class="mt-3 text-center text-danger"
      v-if="state.updatingError"
    >{{state.updatingError.message || state.updatingError}}</div>
  </div>
</template>
<style>
.threshold-input-container {
  width: 100px;
}
</style>
<script>
import CustomSettingsTable from "./CustomSettingsTable";
import DefaultSettingsTable from "./DefaultSettingsTable";
export default {
  name: "alerting-threshold-settings",
  components: {
    CustomSettingsTable,
    DefaultSettingsTable
  },
  props: {
    settings: {
      type: Object,
      default: {}
    },
    state: {
      type: Object,
      default: {}
    },
    projects: {
      type: Array,
      default: []
    }
  },
  data() {
    return {
      fields: [
        {
          key: "project",
          label: "Project",
          sortable: false,
          class: "align-middle pl-2 text-nowrap",
          thStyle: "width:300px"
        },
        {
          key: "lastBlockTime",
          label: "Last Block Time",
          sortable: false,
          class: "p-0 align-middle"
        },
        {
          key: "peerCounts",
          label: "Peer Counts",
          sortable: false,
          class: "p-0 align-middle"
        },
        {
          key: "missedBlocks",
          label: "Missed Blocks",
          sortable: false,
          class: "p-0 align-middle"
        },
        {
          key: "actions",
          label: "Actions",
          sortable: false,
          class: "align-middle text-center",
          thStyle: "width:150px"
        }
      ],
      editingState: {},
      editingItems: {}
    };
  },
  methods: {
    updateSettings(data) {
      this.$emit("onUpdate", data);
    },
    editSetting(project, editingItem) {
      this.editingState = {
        ...this.editingState,
        [project]: true
      };
      this.editingItems = {
        ...this.editingItems,
        [project]: {
          lastBlockTime: {
            ...(editingItem.lastBlockTime || {})
          },
          peerCounts: {
            ...(editingItem.peerCounts || {})
          },
          missedBlocks: {
            ...(editingItem.missedBlocks || {})
          }
        }
      };
    },
    cancelEditing(project) {
      this.editingState = {
        ...this.editingState,
        [project]: false
      };
    },
    updateSetting(project) {
      const newSetting = this.normalizeSetting(this.editingItems[project]);
      let settings = {...this.settings};
      if (project === "default") {
        settings.defaultSettings = newSetting;
      } else {
        settings.customSettings[project] = newSetting;
        if (!newSetting) delete settings.customSettings[project];
      }
      this.updateSettings(settings);
      this.editingState = {
        ...this.editingState,
        [project]: false
      };
    },
    isEditing(project) {
      return this.editingState[project];
    },
    normalizeSetting(newSetting) {
      const out = {};
      for (const key in newSetting) {
        if (Object.keys(newSetting[key]).length) {
          out[key] = newSetting[key];
        }
      }
      return Object.keys(out).length ? out : undefined;
    }
  },
  computed: {
    defaultSettingList() {
      if (!this.settings.defaultSettings) return [];
      return [
        {
          project: "default",
          ...this.settings.defaultSettings
        }
      ];
    },
    customSettingList() {
      if (!this.settings.customSettings) return [];
      return this.projects.map(project => {
        const projectNameWithoutBcl = project.project.startsWith("bcl-")
          ? project.project.substring(4)
          : project.project;
        return {
          project: projectNameWithoutBcl,
          ...this.settings.customSettings[projectNameWithoutBcl]
        };
      });
    }
  }
};
</script>