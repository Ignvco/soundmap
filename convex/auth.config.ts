// Configuration is evaluated by the deployment tool, outside a function context.
export default {
  providers: process.env.AUTH_ISSUER
    ? [
        {
          domain: process.env.AUTH_ISSUER,
          applicationID: process.env.AUTH_AUDIENCE ?? "soundmap",
        },
      ]
    : [],
};
