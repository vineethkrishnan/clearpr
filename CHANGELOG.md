# Changelog

## [0.1.7](https://github.com/vineethkrishnan/clearpr/compare/v0.1.6...v0.1.7) (2026-05-23)


### Bug Fixes

* scope migration CLI globs to the loader being used ([#75](https://github.com/vineethkrishnan/clearpr/issues/75)) ([020b1d2](https://github.com/vineethkrishnan/clearpr/commit/020b1d2567ff2047f04ba615d7d3d53e9baf918d))


### CI/CD

* **deps-dev:** bump the development-dependencies group with 5 updates ([#71](https://github.com/vineethkrishnan/clearpr/issues/71)) ([4681a8d](https://github.com/vineethkrishnan/clearpr/commit/4681a8d0a5c8d69135447144dff0be515e57a502))
* **deps-dev:** bump the development-dependencies group with 6 updates ([#74](https://github.com/vineethkrishnan/clearpr/issues/74)) ([ff90944](https://github.com/vineethkrishnan/clearpr/commit/ff90944de1023ecbe0b3ac0fe21228cb0953e181))
* **deps:** bump qs from 6.15.1 to 6.15.2 ([#77](https://github.com/vineethkrishnan/clearpr/issues/77)) ([8177c4f](https://github.com/vineethkrishnan/clearpr/commit/8177c4f37fe9e2766f4ad5ab5625184d80fe72a9))
* **deps:** bump the production-dependencies group with 5 updates ([#70](https://github.com/vineethkrishnan/clearpr/issues/70)) ([c961c4a](https://github.com/vineethkrishnan/clearpr/commit/c961c4a7c0e1dc8476720746f5e447457c19479e))
* **deps:** bump the production-dependencies group with 8 updates ([#73](https://github.com/vineethkrishnan/clearpr/issues/73)) ([4a03809](https://github.com/vineethkrishnan/clearpr/commit/4a03809987e1fb951eacd2e742a8e487dadd1af8))
* honor severity filter when trivy emits sarif ([#76](https://github.com/vineethkrishnan/clearpr/issues/76)) ([686a86b](https://github.com/vineethkrishnan/clearpr/commit/686a86bef184a9baa20fff7f97b7ee0615b5b301))

## [0.1.6](https://github.com/vineethkrishnan/clearpr/compare/v0.1.5...v0.1.6) (2026-05-10)


### CI/CD

* **deps-dev:** bump fast-uri from 3.1.0 to 3.1.2 ([#67](https://github.com/vineethkrishnan/clearpr/issues/67)) ([d9ea401](https://github.com/vineethkrishnan/clearpr/commit/d9ea401c8f58ce2d0b94a5c764055cc8354c54ad))

## [0.1.5](https://github.com/vineethkrishnan/clearpr/compare/v0.1.4...v0.1.5) (2026-05-10)


### Documentation

* add docs site link to README ([043176b](https://github.com/vineethkrishnan/clearpr/commit/043176b4b9484fc6dff7c6e06c55720277794634))

## [0.1.4](https://github.com/vineethkrishnan/clearpr/compare/v0.1.3...v0.1.4) (2026-05-08)


### Documentation

* **.docker/README:** point at clearpr-docs.vineethnk.in (LU-33) ([#65](https://github.com/vineethkrishnan/clearpr/issues/65)) ([6c7c622](https://github.com/vineethkrishnan/clearpr/commit/6c7c6226bf8a93ee268668d171918f74df5f5eaf))

## [0.1.3](https://github.com/vineethkrishnan/clearpr/compare/v0.1.2...v0.1.3) (2026-05-08)


### Features

* in-progress review UX + LLM-choice warning doc (LU-32) ([#63](https://github.com/vineethkrishnan/clearpr/issues/63)) ([4853937](https://github.com/vineethkrishnan/clearpr/commit/4853937d53feedc20a3983229b2fc7261a0add47))


### Documentation

* add end-to-end setup walkthrough with screenshots and 6 runtime fixes (LU-31) ([#62](https://github.com/vineethkrishnan/clearpr/issues/62)) ([31eb6fd](https://github.com/vineethkrishnan/clearpr/commit/31eb6fdf1138799806ac322c7af810e0230e2828))

## [0.1.2](https://github.com/vineethkrishnan/clearpr/compare/v0.1.1...v0.1.2) (2026-05-08)


### Features

* **docker:** run migrations on startup and trust reverse proxy (LU-31) ([#60](https://github.com/vineethkrishnan/clearpr/issues/60)) ([41afa2d](https://github.com/vineethkrishnan/clearpr/commit/41afa2d7e304357adfc70788cede0bd73c021650))
* implement pgvector, AST-based diff, and PR memory indexing ([#40](https://github.com/vineethkrishnan/clearpr/issues/40)) ([812025d](https://github.com/vineethkrishnan/clearpr/commit/812025d8bbf6642c10220107862f481122917613))
* **webhooks:** typed DTOs at controller boundary (LU-31) ([#48](https://github.com/vineethkrishnan/clearpr/issues/48)) ([8d60e91](https://github.com/vineethkrishnan/clearpr/commit/8d60e913058d428a6d179ad5e1ff54c326d364de))
* **webhooks:** use Redis-backed throttler for multi-replica safety (LU-31) ([#58](https://github.com/vineethkrishnan/clearpr/issues/58)) ([d6b5fa1](https://github.com/vineethkrishnan/clearpr/commit/d6b5fa14756cd81cbc7b0d6c32860d713c2b0d77))


### Bug Fixes

* **diff-engine:** enforce diff size limits and file size cap (LU-31) ([#54](https://github.com/vineethkrishnan/clearpr/issues/54)) ([a4cd04b](https://github.com/vineethkrishnan/clearpr/commit/a4cd04bb943aacef7545fcdbde3bd1acd014c779))
* **docker:** make production build runnable end-to-end (LU-31) ([#61](https://github.com/vineethkrishnan/clearpr/issues/61)) ([35bfb87](https://github.com/vineethkrishnan/clearpr/commit/35bfb8710d06f0d326ef1151d320761a8dc19502))
* **docs:** correct GITHUB_PRIVATE_KEY docs and clarify scaling reality (LU-31) ([#59](https://github.com/vineethkrishnan/clearpr/issues/59)) ([b1e88ea](https://github.com/vineethkrishnan/clearpr/commit/b1e88eafbc5389b638335673e8ec415148247e91))


### Refactoring

* complete cross-module ports and drop forwardRef cycles (LU-31) ([#55](https://github.com/vineethkrishnan/clearpr/issues/55)) ([f6b82f5](https://github.com/vineethkrishnan/clearpr/commit/f6b82f5a8b669ad534708843a1d0d8be9ad30ce5))
* **db:** regenerate InitialSchema migration from @Entity records (LU-31) ([#49](https://github.com/vineethkrishnan/clearpr/issues/49)) ([5ae9880](https://github.com/vineethkrishnan/clearpr/commit/5ae98805f2684d657492146ce480b20b8f3d3408))
* extract cross-module ports for memory and review (LU-31) ([#52](https://github.com/vineethkrishnan/clearpr/issues/52)) ([bddcedc](https://github.com/vineethkrishnan/clearpr/commit/bddcedc2a0898d146e89d1f612613007c07d0c75))
* **memory:** replace EntitySchema with records and mappers (LU-31) ([#47](https://github.com/vineethkrishnan/clearpr/issues/47)) ([9d25bd7](https://github.com/vineethkrishnan/clearpr/commit/9d25bd705407d4d5f4ac80d6685a2dfacf78df8f))
* rename single-op service classes to use-cases (LU-31) ([#50](https://github.com/vineethkrishnan/clearpr/issues/50)) ([6ee59d2](https://github.com/vineethkrishnan/clearpr/commit/6ee59d2c440a149b5bb310a43c1c6996a9895eb7))
* split god services, services to use-cases (LU-31) ([#46](https://github.com/vineethkrishnan/clearpr/issues/46)) ([690750d](https://github.com/vineethkrishnan/clearpr/commit/690750d48276d9d8f3ce079e50079472e8c8e7ca))


### Documentation

* add SUMMARY.md to each top-level module ([#44](https://github.com/vineethkrishnan/clearpr/issues/44)) ([8c2cd50](https://github.com/vineethkrishnan/clearpr/commit/8c2cd50272ccc679d0decc37c2fd37c73f9e99f1))
* post-migration cleanup of architecture docs and infra adapter location (LU-31) ([#57](https://github.com/vineethkrishnan/clearpr/issues/57)) ([bab7fa7](https://github.com/vineethkrishnan/clearpr/commit/bab7fa74b6ed004228677bac14829474c8d5e584))
* **site:** add architecture guide, contributing conventions, dev workflow ([#45](https://github.com/vineethkrishnan/clearpr/issues/45)) ([c07b399](https://github.com/vineethkrishnan/clearpr/commit/c07b399ce96576004b3d854493c2ba098ca89f6b))
* sync architecture and conventions with R3 patterns (LU-31) ([#51](https://github.com/vineethkrishnan/clearpr/issues/51)) ([83683ac](https://github.com/vineethkrishnan/clearpr/commit/83683acf976f8a466a55241504ebb821631916aa))


### CI/CD

* **deps-dev:** bump the development-dependencies group with 2 updates ([#38](https://github.com/vineethkrishnan/clearpr/issues/38)) ([7099f29](https://github.com/vineethkrishnan/clearpr/commit/7099f29fb6399554eedab273ca195f3e84773019))
* **deps:** bump the github-actions group with 7 updates ([#35](https://github.com/vineethkrishnan/clearpr/issues/35)) ([d94a477](https://github.com/vineethkrishnan/clearpr/commit/d94a47747105d256117f7ed5d7f8dad5e5eb6e65))
* **deps:** bump the production-dependencies group with 3 updates ([#37](https://github.com/vineethkrishnan/clearpr/issues/37)) ([52eb193](https://github.com/vineethkrishnan/clearpr/commit/52eb193db2da478046945c1927c1f90d0e2e29c4))

## [0.1.1](https://github.com/vineethkrishnan/clearpr/compare/v0.1.0...v0.1.1) (2026-05-01)


### Features

* **api:** implement milestones 1-5 with DDD hexagonal architecture ([#6](https://github.com/vineethkrishnan/clearpr/issues/6)) ([2ab28a8](https://github.com/vineethkrishnan/clearpr/commit/2ab28a896fb382ad859ccb4a13faddb40796a77d))
* close M2/M5 gaps + installation cleanup + lodash CVE ([#7](https://github.com/vineethkrishnan/clearpr/issues/7)) ([fb08fb8](https://github.com/vineethkrishnan/clearpr/commit/fb08fb82b17affc669be8ccd3bf63e74dca508df))


### Bug Fixes

* **ci:** correct docker hub namespace to vineethnkrishnan ([#18](https://github.com/vineethkrishnan/clearpr/issues/18)) ([e8f34d6](https://github.com/vineethkrishnan/clearpr/commit/e8f34d6db627cffc810cfe1bede756d1ae74aa30))
* **ci:** remove hashFiles() job-level guards so workflows actually run ([#20](https://github.com/vineethkrishnan/clearpr/issues/20)) ([99e512d](https://github.com/vineethkrishnan/clearpr/commit/99e512da71c3be43fe0d2836f0efb758088825fb))


### Documentation

* **docker:** add docker hub description and readme sync workflow ([#19](https://github.com/vineethkrishnan/clearpr/issues/19)) ([6e56ab9](https://github.com/vineethkrishnan/clearpr/commit/6e56ab94583ce52a8d0353be94dbfa566bd4ffd5))
* **docs:** add docker image install path and manual publish dispatch ([#17](https://github.com/vineethkrishnan/clearpr/issues/17)) ([c47ccf1](https://github.com/vineethkrishnan/clearpr/commit/c47ccf1b51c395a3081136c96a7077e7c6a563ac))
* **docs:** add requirements, FAQ, and help center pages ([#12](https://github.com/vineethkrishnan/clearpr/issues/12)) ([3c86ccf](https://github.com/vineethkrishnan/clearpr/commit/3c86ccffe3cc1427b965ab0428053d4b7077f394))
* **docs:** update pr-commands with implementation details ([#9](https://github.com/vineethkrishnan/clearpr/issues/9)) ([3ec1064](https://github.com/vineethkrishnan/clearpr/commit/3ec1064dcb672db899078c32153c50f488137f1c))
* **prd:** add comprehensive PRD and fix CI workflows ([#4](https://github.com/vineethkrishnan/clearpr/issues/4)) ([66b6c5d](https://github.com/vineethkrishnan/clearpr/commit/66b6c5d271788c1adb0f26f447644df04638a11c))


### CI/CD

* **deps:** bump the github-actions group with 4 updates ([#3](https://github.com/vineethkrishnan/clearpr/issues/3)) ([f18afb1](https://github.com/vineethkrishnan/clearpr/commit/f18afb19188f00a606041d2624f35e127b946567))
* **docs:** allow manual dispatch of docs deploy ([#16](https://github.com/vineethkrishnan/clearpr/issues/16)) ([4e6c770](https://github.com/vineethkrishnan/clearpr/commit/4e6c770508568eb2cffaedf8e211c14c79364f4a))
* **lint:** allow deps-dev scope in pr title check ([#26](https://github.com/vineethkrishnan/clearpr/issues/26)) ([e569699](https://github.com/vineethkrishnan/clearpr/commit/e5696999a42d82f84b8674b2840d6c23f4e977ce))
* **release:** drop invalid hashFiles guard in publish-tarball if (LU-29) ([#31](https://github.com/vineethkrishnan/clearpr/issues/31)) ([8cfe947](https://github.com/vineethkrishnan/clearpr/commit/8cfe9477a09cda8deb0511f9dd2b6453bc9bdfcb))
* **release:** grant deployments write permission for docs deploy (LU-30) ([#32](https://github.com/vineethkrishnan/clearpr/issues/32)) ([83c4f0d](https://github.com/vineethkrishnan/clearpr/commit/83c4f0d4ab791d96cd7a36467519a4909741190e))
