import arcjet, { tokenBucket } from "@arcjet/next";

const aj = arcjet({
  key: process.env.ARCJET_KEY,
  characteristics: ["userId"], // Track based on Clerk userId
  rules: [
    tokenBucket({
      mode: "LIVE",
      refillRate: 10,
      interval: 3600,
      capacity: 10,
    }),
  ],
});

export default aj;
