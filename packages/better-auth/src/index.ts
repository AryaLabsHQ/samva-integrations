export { renderAndSend } from "./core";
export { samvaEmail } from "./fragments";
export { defaultSubjects, defaultTemplates, renderTemplate } from "./templates";
export type {
  SamvaBetterAuthOptions,
  SamvaClient,
  SamvaEmailDataByTrigger,
  SamvaEmailTrigger,
  SamvaRenderedEmail,
  SamvaTemplate,
  SamvaTemplateOutput,
  SamvaTemplates,
} from "./types";
export { withSamva } from "./with-samva";
export type { SamvaBetterAuthPluginOptions, SamvaBetterAuthTransformOptions } from "./with-samva";
