/**
 * Custom webpack configuration
 *
 * @format
 */

process.env.ROOT_DIR = __dirname

module.exports = {
  webpack: config => {
    config.node = {
      __filename: true,
    }

    return config
  },
}
