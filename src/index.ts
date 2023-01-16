import commandLineArgs from "command-line-args"
import commandLineUsage, { OptionDefinition } from "command-line-usage"
import { BuildOptions, watchFlake } from "flakes"
import { exit } from "process"

const optionDefinitions: OptionDefinition[] = [
  {
    name: "help",
    description: "Show help",
    alias: "h",
    type: Boolean,
  },
  {
    name: "installable",
    description: "The specific output of the flake.",
    type: String,
    multiple: false,
    defaultOption: true,
    typeLabel: "{underline installable}",
  },
  {
    name: "skip-initial-build",
    description:
      "Usually the flake is build once after starting flake-watcher even if no changes were made. This option skips that initial build.",
    type: Boolean,
  },
  {
    name: "dont-pass-unknown",
    description: "By default all unknown arguments are passed to `nix build`. This option disables that behaviour.",
    type: Boolean,
  },
]

const sections = [
  {
    header: "flake-watcher",
    content:
      "Watch a nix flake directory for changes, and rebuild the flake when a change is detected. Prints the new output path if it changed.",
  },
  {
    header: "Synopsis",
    content: ["$ flake-watcher {underline installable}", "$ flake-watcher .#default"],
  },
  {
    header: "Options",
    optionList: optionDefinitions,
  },
  {
    content: "Project home: {underline https://github.com/zebreus/flake-watcher}",
  },
]

const printUsage = () => {
  const usage = commandLineUsage(sections)
  console.log(usage)
}

const options = commandLineArgs(optionDefinitions, { partial: true })

if (options["help"]) {
  printUsage()
  exit(0)
}

const unknownArgs = (options["_unknown"] as string[]) || []

if (unknownArgs.length > 0 && options["dont-pass-unknown"]) {
  console.error("Unknown options: " + unknownArgs.join(" "))
  console.error("Consider disabling --dont-pass-unknown to pass the unknown options to nix build")
  exit(1)
}

if (unknownArgs[0] && !unknownArgs[0]?.startsWith("-")) {
  console.error("Expected arguments passed to nix build to start with '-' " + unknownArgs[0])
}

const installable = options["installable"] as string | undefined
const path = installable?.split("#")[0] || undefined
const packageName = installable?.split("#")[1]
const skipInitialBuild = !!options["skip-initial-build"]

const buildOptions = {
  path,
  skipInitialBuild,
  packageName,
  buildOptions: unknownArgs,
} as Partial<BuildOptions>

watchFlake(async path => {
  console.log(path)
}, buildOptions)

export {}
