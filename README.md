## Motif - Sdk 
 
1. Install and build repo
	yarn
	yarn build
2. Deploy library to npm
	update package.json with the next version and username
	update package.json with latest @motif-foundation/asset
	update package.json with latest @motif-foundation/listing
	update package.json with latest @motif-foundation/item-metadata
	npm login (if not logged in)
	npm pack
	npm publish --access=public
