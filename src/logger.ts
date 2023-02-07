let verbocity: number = 0

const setVerbosity = (mode: number): void => {
  verbocity = mode
}

const log = (...rest: (object | string)[]): void => {
  if (verbocity > 0) {
    console.log('DEBUG: ', rest.join("\n"))
  }
}

export { log, setVerbosity }