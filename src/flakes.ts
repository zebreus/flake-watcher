import { exec } from "child_process"
import GlobWatcher from "glob-watcher"
import { resolve } from "path"

export type BuildOptions = {
  // The path to the package to build. In `nix build .#foo`, `.` is the path.
  //
  // Any changes to files in this path will trigger a rebuild.
  path: string
  // The name of the package to build. In `nix build .#foo`, `foo` is the package name.
  packageName: string | undefined
  // Additional options passed to nix build
  buildOptions?: string[]
  // Skip the first build before watching
  skipInitialBuild?: boolean
}

type ResolvedBuildOptions = Required<BuildOptions> & {
  targetPackage: string
}

const resolveBuildOptions = (options: Partial<BuildOptions> = {}): ResolvedBuildOptions => {
  const path = resolve(options.path || "./")
  const packageName = options.packageName
  const targetPackage = [path, packageName].filter(v => v).join("#")
  const buildOptions = options.buildOptions || []
  const skipInitialBuild = options.skipInitialBuild || false

  return {
    path,
    packageName,
    targetPackage,
    buildOptions,
    skipInitialBuild,
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

export const watchFlake = async (
  callback: (new_path: string) => Promise<void> | void,
  options: Partial<BuildOptions> = {}
) => {
  const resolvedOptions = resolveBuildOptions(options)
  const { path, skipInitialBuild } = resolvedOptions

  let lastOutput = ""

  const changeHandler = async () => {
    try {
      const result = await build(resolvedOptions)
      const unchanged = result === lastOutput
      if (unchanged) {
        return
      }

      lastOutput = result
      await callback(result)
    } catch (e) {
      console.error(e)
    }
  }

  if (!skipInitialBuild) {
    await changeHandler()
  }

  watch(changeHandler, path)
}
