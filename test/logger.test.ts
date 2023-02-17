import Logger from '../src/logger'
const logger = new Logger()

describe('Test logger', () => {
  test('when verbocity 0', () => {
    const logSpy = jest.spyOn(global.console, 'log');
    logger.setVerbosity(0)
    logger.log('Some log text...')
    expect(logSpy).toHaveBeenCalledTimes(0)

    logSpy.mockRestore()
  })

  test('when verbocity 1', () => {
    const logSpy = jest.spyOn(global.console, 'log');

    logger.setVerbosity(1)
    logger.log('Some log text...')
    expect(logSpy).toHaveBeenCalledTimes(1)
    expect(logSpy).toHaveBeenCalledWith('DEBUG: ', 'Some log text...');

    logSpy.mockRestore()
  })
})
