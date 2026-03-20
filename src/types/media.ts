export type UploadedAsset = {
  id: string;
  name: string;
  type: string;
  sizeMb: number;
  status: "local" | "uploaded";
  url?: string;
};
