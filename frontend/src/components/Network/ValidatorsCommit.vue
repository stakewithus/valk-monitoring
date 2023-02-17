<template>
  <div class="position-relative d-flex justify-content-center">
    <div class="blocks d-flex">
      <a
        v-for="commit in formatCommits(commits)"
        :key="commit.height"
        :class="commit.className"
        @mouseover="showBlock(commit)"
      />
    </div>
    <div class="tooltip-container w-100 position-absolute d-flex align-items-center justify-content-center">
      <div class="block-tooltip d-flex align-items-center shadow-lg rounded">
        Block Height
        &nbsp;
        <span class="block-line" :class="commitClass"></span>
        &nbsp;
        {{ commitBlock|number }}
      </div>
    </div>
  </div>
</template>
<style scoped>
.blocks {
  width: 80%;
}
.blocks > a {
  display: block;
  height: 34px;
  flex: 1;
  margin: 0 0.5px;
}
.blue {
  background: #2465e0;
}
.green {
  background: #43b753;
}
.red {
  background: #ff5465;
}
.tooltip-container {
  top: 34px;
  visibility: hidden;
  opacity: 0;
  transition: all ease 0.5s;
  z-index: 2;
}
.tooltip-container .block-tooltip {
  background: #fff;
  font-size: 16px;
  padding: 10px 15px;
  margin: 10px auto 0;
}

.tooltip-container .block-line {
  font-size: 12px;
  padding: 3px 8px 1px;
}
.blocks:hover + .tooltip-container {
  visibility: visible;
  opacity: 1;
}
</style>
<script>
export default {
  props: {
    commits: {
      type: Array,
      default() {
        return [];
      }
    },
    networkName: {
      type: String
    },
    projectName: {
      type: String
    }
  },
  data() {
    return {
      commitBlock: null,
      commitClass: null
    };
  },
  methods: {
    showBlock(commit) {
      this.commitBlock = commit.height;
      this.commitClass = commit.className;
    },
    formatCommits(commits) {
      return commits.map(c => ({
        ...c,
        className: c.commit ? "green" : "red"
      }));
    }
  }
};
</script>
