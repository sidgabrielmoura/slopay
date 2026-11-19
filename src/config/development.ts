export function developmentFeaturesEnabled() {
  const environment = process.env.AMBIENTE?.trim().toLowerCase();
  return process.env.NODE_ENV === "development" && (!environment || environment === "dev");
}
