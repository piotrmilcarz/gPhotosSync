class Logger {
  private verbocity: number = 0

  setVerbosity(mode: number): void {
    this.verbocity = mode
  }

  log(...rest: (object | string)[]): void {
    if (this.verbocity > 0) {
      console.log('DEBUG: ', rest.join("\n"))
    }
  }

}

export default Logger 