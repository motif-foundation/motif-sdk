import {
  Generator as ItemGenerator,
  Parser as ItemParser,
  Validator as ItemValidator,
  validateVersion as itemValidateVersion,
  supportedVersions as itemSupportedVersions,
  supportedVersionsTypeMapping as itemSupportedVersionsTypeMapping,
} from '@motif-foundation/item-metadata/dist/src'
import * as ItemMetadataTypes from '@motif-foundation/item-metadata/dist/types/types'

import {
  Generator as SpaceGenerator,
  Parser as SpaceParser,
  Validator as SpaceValidator,
  validateVersion as spaceValidateVersion,
  supportedVersions as spaceSupportedVersions,
  supportedVersionsTypeMapping as spaceSupportedVersionsTypeMapping,
} from '@motif-foundation/space-metadata/dist/src'
import * as SpaceMetadataTypes from '@motif-foundation/space-metadata/dist/types/types'

import {
  Generator as AvatarGenerator,
  Parser as AvatarParser,
  Validator as AvatarValidator,
  validateVersion as avatarValidateVersion,
  supportedVersions as avatarSupportedVersions,
  supportedVersionsTypeMapping as avatarSupportedVersionsTypeMapping,
} from '@motif-foundation/avatar-metadata/dist/src'
import * as AvatarMetadataTypes from '@motif-foundation/avatar-metadata/dist/types/types'

import {
  Generator as LandGenerator,
  Parser as LandParser,
  Validator as LandValidator,
  validateVersion as landValidateVersion,
  supportedVersions as landSupportedVersions,
  supportedVersionsTypeMapping as landSupportedVersionsTypeMapping,
} from '@motif-foundation/land-metadata/dist/src'
import * as LandMetadataTypes from '@motif-foundation/land-metadata/dist/types/types'

export { ItemMetadataTypes }
export { itemValidateVersion, itemSupportedVersions, itemSupportedVersionsTypeMapping }
export type JSONLike = { [key: string]: any }

export function generateItemMetadata(version: string, data: JSONLike): string {
  const generator = new ItemGenerator(version)
  return generator.generateJSON(data)
}

export function parseItemMetadata(version: string, json: string) {
  const parser = new ItemParser(version)
  return parser.parse(json)
}

export function validateItemMetadata(version: string, data: JSONLike): boolean {
  const validator = new ItemValidator(version)
  return validator.validate(data)
}

export { SpaceMetadataTypes }
export { spaceValidateVersion, spaceSupportedVersions, spaceSupportedVersionsTypeMapping }

export function generateSpaceMetadata(version: string, data: JSONLike): string {
  const generator = new SpaceGenerator(version)
  return generator.generateJSON(data)
}

export function parseSpaceMetadata(version: string, json: string) {
  const parser = new SpaceParser(version)
  return parser.parse(json)
}

export function validateSpaceMetadata(version: string, data: JSONLike): boolean {
  const validator = new SpaceValidator(version)
  return validator.validate(data)
}

export { AvatarMetadataTypes }
export {
  avatarValidateVersion,
  avatarSupportedVersions,
  avatarSupportedVersionsTypeMapping,
}

export function generateAvatarMetadata(version: string, data: JSONLike): string {
  const generator = new AvatarGenerator(version)
  return generator.generateJSON(data)
}

export function parseAvatarMetadata(version: string, json: string) {
  const parser = new AvatarParser(version)
  return parser.parse(json)
}

export function validateAvatarMetadata(version: string, data: JSONLike): boolean {
  const validator = new AvatarValidator(version)
  return validator.validate(data)
}

export { LandMetadataTypes }
export { landValidateVersion, landSupportedVersions, landSupportedVersionsTypeMapping }

export function generateLandMetadata(version: string, data: JSONLike): string {
  const generator = new LandGenerator(version)
  return generator.generateJSON(data)
}

export function parseLandMetadata(version: string, json: string) {
  const parser = new LandParser(version)
  return parser.parse(json)
}

export function validateLandMetadata(version: string, data: JSONLike): boolean {
  const validator = new LandValidator(version)
  return validator.validate(data)
}
