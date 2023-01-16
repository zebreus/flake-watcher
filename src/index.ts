import { watchFlake } from "flakes"

watchFlake(
  async path => {
    console.log("New path: " + path)
  },
  { path: "../bachelor-thesis" }
)

export {}
