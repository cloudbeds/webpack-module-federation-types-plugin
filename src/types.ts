export type FederationConfig = {
  name: string,
  exposes: Record<string, string>,
}

export type CompileResult = {
  isSuccess: boolean,
  fileContent: string,
};
