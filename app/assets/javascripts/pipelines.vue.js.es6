//= require vue

(gl => {
  gl.VuePipeLines = Vue.extend({
    props: ['pipelines', 'count'],
    template: `
      <section class="table-holder">
        <table class="table ci-table">
          <tr>
            <th>Status</th>
            <th>Pipeline</th>
            <th>Commit</th>
            <th>Stages</th>
            <th></th>
            <th class="hidden-xs"></th>
          <tr>
          <tr>
            <div v-for='pipeline in pipes'>
              <vue-pipeline :pipeline='pipeline'></vue-pipeline>
            </div>
          </tr>
        </table>
      </section>
    `,
    computed: {
      pipes() {
        return this.pipelines
      }
    }
  })
})(window.gl || (window.gl = {}))
