<template>
  <div>
    <b-table
      id="userListTable"
      striped
      hover
      outlined
      no-local-sorting
      responsive
      :fields="fields"
      :items="list.items"
      :busy="list.fetching"
    >
      <div slot="table-busy" class="text-center text-info my-2">
        <b-spinner class="align-middle"></b-spinner>
        <strong>Loading...</strong>
      </div>
      <template v-slot:cell(index)="data">{{ data.index + 1 }}</template>
      <template v-slot:cell(username)="data">{{ data.value }}</template>
      <template v-slot:cell(policies)="data">{{ data.value && data.value.join(', ') }}</template>
      <template v-slot:cell(isEmailVerified)="data">{{ data.value }}</template>
      <template v-slot:cell(actions)="data">
        <b-button variant="link" @click="$emit('onDeleteUser',data.item)">Delete</b-button>
        <b-button variant="link" :to="{name: 'user-edit',params:{id: data.item.username}}">Edit</b-button>
      </template>
    </b-table>
    <div>
      <span>Total items: {{list.items.length}}</span>
    </div>
  </div>
</template>
<style>
.th-user-actions {
  width: 200px;
  text-align: right;
}
</style>
<script>
export default {
  props: {
    list: {
      type: Object,
      required: true
    }
  },
  data() {
    return {
      fields: [
        "index",
        { key: "username", label: "Username", sortable: false },
        { key: "policies", label: "Policies", sortable: false },
        { key: "isEmailVerified", label: "Email Verified?", sortable: false },
        {
          key: "actions",
          label: "",
          class: "th-user-actions"
        }
      ]
    };
  }
};
</script>