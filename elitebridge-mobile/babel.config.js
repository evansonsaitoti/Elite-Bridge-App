module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      [
        "babel-preset-expo",
        {
          // RN 0.81's Hermes compiler requires private fields to be lowered.
          unstable_transformProfile: "default",
        },
      ],
    ],
  };
};
