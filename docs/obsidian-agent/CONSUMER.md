# Documentation consumer contract

`docs/obsidian-agent/v<version>` is the immutable `product-docs` payload. Its manifest records package identity, semantic version, content digest, release tag, and full commit. The release archive adds `cavi-release.json` and is dispatched to CAVI Home with `CONSUMER_DISPATCH_TOKEN`.
