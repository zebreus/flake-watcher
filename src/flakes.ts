import { exec } from "child_process"
import GlobWatcher from "glob-watcher"
import { resolve } from "path"

type BuildOptions = {
  path: string
  packageName: string | undefined
  buildOptions?: string[]
}

type ResolvedBuildOptions = Required<BuildOptions> & {
  targetPackage: string
}

const resolveBuildOptions = (options: Partial<BuildOptions> = {}): ResolvedBuildOptions => {
  const path = resolve(options.path || "./")
  const packageName = options.packageName
  const targetPackage = [path, packageName].filter(v => v).join("#")
  const buildOptions = options.buildOptions || []

  return {
    path,
    packageName,
    targetPackage,
    buildOptions,
  }
}

export const sh = async (cmd: string) => {
  return new Promise<{ stdout: string; stderr: string }>(function (resolve, reject) {
    exec(cmd, (err, stdout, stderr) => {
      if (err) {
        const error = new Error("Failed to execute command: " + cmd + "\nOutput: " + stdout + "\nError: " + stderr)
        delete err.stack
        //@ts-expect-error: we're adding a property to the error
        error.details = { ...err, stderr, stdout }
        //@ts-expect-error: we're adding a property to the error
        error.stack = undefined
        reject(error)
      } else {
        resolve({ stdout, stderr })
      }
    })
  })
}

export const build = async (options: Partial<BuildOptions> = {}) => {
  const { targetPackage, buildOptions } = resolveBuildOptions(options)

  const { stdout } = await sh(`nix build --no-link --print-out-paths ${targetPackage} ${buildOptions.join(" ") || ""}`)
  const created_path = stdout.trim().split(" ")[0]
  if (!created_path) {
    throw new Error("Failed to get output path")
  }
  return created_path
}

const watch = (callback: () => Promise<void> | void, path: string) => {
  GlobWatcher([path + "/**/*"], async done => {
    await callback()
    done()
  })
}

export const watchFlake = (
  callback: (new_path: string) => Promise<void> | void,
  options: Partial<BuildOptions> = {}
) => {
  const resolvedOptions = resolveBuildOptions(options)
  const { path } = resolvedOptions

  watch(async () => {
    try {
      const result = await build(resolvedOptions)
      await callback(result)
    } catch (e) {
      console.error(e)
    }
  }, path)
}
