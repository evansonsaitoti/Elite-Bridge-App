module.exports = function (api) {
  api.cache(true);
  return {
<<<<<<< HEAD
    presets: ["babel-preset-expo"],
    plugins: ["nativewind/babel"],
=======
    presets: [
      [
        "babel-preset-expo",
        {
          // RN 0.81's Hermes compiler requires private fields to be lowered.
          unstable_transformProfile: "default",
        },
      ],
    ],
>>>>>>> a6bb48ca8ed2abbc72d940feb07e16062f4677d4
  };
};
