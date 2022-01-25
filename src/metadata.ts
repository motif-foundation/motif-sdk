import {
  Generator as ItemGenerator,
  Parser as ItemParser,
  Validator as ItemValidator,
  validateVersion as itemValidateVersion,
  supportedVersions as itemSupportedVersions,
  supportedVersionsTypeMapping as itemSupportedVersionsTypeMapping,
} from "@motif-foundation/item-metadata/dist/src";
import * as ItemMetadataTypes from "@motif-foundation/item-metadata/dist/types/types";

export { ItemMetadataTypes };
export { itemValidateVersion, itemSupportedVersions, itemSupportedVersionsTypeMapping}
export type JSONLike = { [key: string]: any };

export function generateItemMetadata(version: string, data: JSONLike): string {
  const generator = new ItemGenerator(version);
  return generator.generateJSON(data);
}

export function parseItemMetadata(version: string, json: string) {
  const parser = new ItemParser(version);
  return parser.parse(json);
}

export function validateItemMetadata(version: string, data: JSONLike): boolean {
  const validator = new ItemValidator(version);
  return validator.validate(data);
}