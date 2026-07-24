# CreatorFlow local data

CreatorFlow stores its local knowledge repository in `knowledge.json` in this
directory by default. Runtime data is ignored by Git.

Server operators may override the directory with `CREATORFLOW_DATA_DIR`.
Clients cannot provide or override this filesystem path.
