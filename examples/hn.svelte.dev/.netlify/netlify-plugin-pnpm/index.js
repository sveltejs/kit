export default {
  onPreBuild: async ({ utils: { build, run } }) => {
    try {
      await run.command("npm install -g pnpm")
      await run.command("pnpm install")
    } catch (error) {
      return build.failBuild(error)
    }
  }
}
