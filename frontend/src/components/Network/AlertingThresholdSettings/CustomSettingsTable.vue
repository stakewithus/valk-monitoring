<template>
  <b-table
    id="customSettingsTable"
    :items="items"
    :fields="fields"
    :busy="isBusy"
    responsive
    bordered
    small
    no-local-sorting
  >
    <template v-slot:table-busy>
      <div class="text-center text-info my-2">
        <b-spinner class="align-middle"></b-spinner>
        <strong>Loading...</strong>
      </div>
    </template>
    <template v-slot:head(lastBlockTime)="data">
      <div class="text-center p-1">{{data.label}}</div>
      <div class="d-flex align-items-center border-top">
        <div class="flex-1 text-center border-right p-1">Warning</div>
        <div class="flex-1 text-center p-1">Critical</div>
      </div>
    </template>
    <template v-slot:head(peerCounts)="data">
      <div class="text-center p-1">{{data.label}}</div>
      <div class="d-flex align-items-center border-top">
        <div class="flex-1 text-center border-right p-1">Warning</div>
        <div class="flex-1 text-center p-1">Critical</div>
      </div>
    </template>
    <template v-slot:head(missedBlocks)="data">
      <div class="text-center p-1">{{data.label}}</div>
      <div class="d-flex align-items-center border-top">
        <div class="flex-1 text-center border-right p-1">Warning</div>
        <div class="flex-1 text-center p-1">Critical</div>
      </div>
    </template>

    <template v-slot:cell(lastBlockTime)="data">
      <div class="d-flex align-items-center">
        <div class="flex-1 text-center border-right p-1">
          <div v-if="isEditing(data.item.project)" class="m-auto threshold-input-container">
            <b-form-input
              size="sm"
              v-model="editingItems[data.item.project][data.field.key].warning"
              placeholder
              type="number"
              min="0"
              autofocus
              :number="true"
            ></b-form-input>
          </div>
          <span v-else>{{data.value?data.value.warning:'--'}}</span>
        </div>
        <div class="flex-1 text-center p-1">
          <div v-if="isEditing(data.item.project)" class="m-auto threshold-input-container">
            <b-form-input
              size="sm"
              v-model="editingItems[data.item.project][data.field.key].critical"
              placeholder
              type="number"
              min="0"
              :number="true"
            ></b-form-input>
          </div>
          <span v-else>{{data.value?data.value.critical:'--'}}</span>
        </div>
      </div>
    </template>

    <template v-slot:cell(peerCounts)="data">
      <div class="d-flex align-items-center">
        <div class="flex-1 text-center border-right p-1">
          <div v-if="isEditing(data.item.project)" class="m-auto threshold-input-container">
            <b-form-input
              size="sm"
              v-model="editingItems[data.item.project][data.field.key].warning"
              placeholder
              type="number"
              min="0"
              :number="true"
            ></b-form-input>
          </div>
          <span v-else>{{data.value?data.value.warning:'--'}}</span>
        </div>
        <div class="flex-1 text-center p-1">
          <div v-if="isEditing(data.item.project)" class="m-auto threshold-input-container">
            <b-form-input
              size="sm"
              v-model="editingItems[data.item.project][data.field.key].critical"
              placeholder
              type="number"
              min="0"
              :number="true"
            ></b-form-input>
          </div>
          <span v-else>{{data.value?data.value.critical:'--'}}</span>
        </div>
      </div>
    </template>

    <template v-slot:cell(missedBlocks)="data">
      <div class="d-flex align-items-center">
        <div class="flex-1 text-center border-right p-1">
          <div v-if="isEditing(data.item.project)" class="m-auto threshold-input-container">
            <b-form-input
              size="sm"
              v-model="editingItems[data.item.project][data.field.key].warning"
              placeholder
              type="number"
              min="0"
              :number="true"
            ></b-form-input>
          </div>
          <span v-else>{{data.value?data.value.warning:'--'}}</span>
        </div>
        <div class="flex-1 text-center p-1">
          <div v-if="isEditing(data.item.project)" class="m-auto threshold-input-container">
            <b-form-input
              size="sm"
              v-model="editingItems[data.item.project][data.field.key].critical"
              placeholder
              type="number"
              min="0"
              :number="true"
            ></b-form-input>
          </div>
          <span v-else>{{data.value?data.value.critical:'--'}}</span>
        </div>
      </div>
    </template>
    <template v-slot:cell(actions)="data">
      <div class="d-flex align-items-center justify-content-center">
        <b-button
          v-if="!isEditing(data.item.project)"
          variant="primary"
          size="sm"
          @click="editSetting(data.item.project,rawSettings[data.item.project]||{})"
        >Edit</b-button>
        <b-button
          class="ml-1"
          v-if="!isEditing(data.item.project)"
          variant="outline-dark"
          size="sm"
          v-b-tooltip.hover
          title="Reset default"
          @click="editSetting(data.item.project,{})"
        >Reset</b-button>
        <b-button
          v-else
          variant="outline-secondary"
          size="sm"
          @click="cancelEditing(data.item.project)"
        >Cancel</b-button>
        <b-button
          class="ml-1"
          v-if="isEditing(data.item.project)"
          variant="primary"
          size="sm"
          @click="updateSetting(data.item.project)"
        >Save</b-button>
      </div>
    </template>
  </b-table>
</template>
<style>
#customSettingsTable td:not(:last-child):not(:first-child),
#customSettingsTable th:not(:last-child):not(:first-child) {
  min-width: 150px;
}
</style>
<script>
export default {
  name: "custom-settings-tables",
  props: {
    rawSettings: {
      type: Object
    },
    items: {
      type: Array,
      default: []
    },
    fields: {
      type: Array,
      required: true
    },
    isBusy: {
      type: Boolean,
      default: false
    },
    editingItems: {
      type: Object,
      required: true,
      default: {}
    },
    isEditing: {
      type: Function
    },
    editSetting: {
      type: Function
    },
    cancelEditing: {
      type: Function
    },
    updateSetting: {
      type: Function
    }
  }
};
</script>