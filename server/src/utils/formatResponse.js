export const formatSuccess = (data, meta = null) => ({
  success: true,
  data,
  ...(meta && { meta })
})

export const formatError = (message, errors = null) => ({
  success: false,
  message,
  ...(errors && { errors })
})
