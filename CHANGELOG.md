# [1.9.0](https://github.com/auditmos/tstack-on-cf/compare/v1.8.0...v1.9.0) (2026-08-08)


### Features

* **cloudflare:** give the Worker config a stated posture ([aae03ea](https://github.com/auditmos/tstack-on-cf/commit/aae03eace37ce7e32bf9b870c67e5748aedf826c)), closes [#29](https://github.com/auditmos/tstack-on-cf/issues/29) [#32](https://github.com/auditmos/tstack-on-cf/issues/32)

# [1.8.0](https://github.com/auditmos/tstack-on-cf/compare/v1.7.1...v1.8.0) (2026-08-08)


### Features

* **docs:** make the requirements directory real and dead pointers fatal ([76ba5c1](https://github.com/auditmos/tstack-on-cf/commit/76ba5c1001ab3f704036465aec5b4ee7f1b61881)), closes [#25](https://github.com/auditmos/tstack-on-cf/issues/25) [#29](https://github.com/auditmos/tstack-on-cf/issues/29)

## [1.7.1](https://github.com/auditmos/tstack-on-cf/compare/v1.7.0...v1.7.1) (2026-08-07)


### Bug Fixes

* **ci:** stop the major-upgrade report from silently under-reporting ([75f8b90](https://github.com/auditmos/tstack-on-cf/commit/75f8b906bb31f691ce723367a4b3e1a091f87fa7)), closes [#28](https://github.com/auditmos/tstack-on-cf/issues/28)

# [1.7.0](https://github.com/auditmos/tstack-on-cf/compare/v1.6.0...v1.7.0) (2026-08-07)


### Features

* **api:** document where authentication attaches, and say the demo has none ([9bb2248](https://github.com/auditmos/tstack-on-cf/commit/9bb2248b3133f62eb52bab0109f29da022f4f387)), closes [#26](https://github.com/auditmos/tstack-on-cf/issues/26)

# [1.6.0](https://github.com/auditmos/tstack-on-cf/compare/v1.5.5...v1.6.0) (2026-08-07)


### Features

* **cf:** declare required secrets in wrangler config ([b7e3ff1](https://github.com/auditmos/tstack-on-cf/commit/b7e3ff10f1147f1f7852d895ab4334a070b18074)), closes [#23](https://github.com/auditmos/tstack-on-cf/issues/23)

## [1.5.5](https://github.com/auditmos/tstack-on-cf/compare/v1.5.4...v1.5.5) (2026-07-22)


### Bug Fixes

* **ci:** stop pre-push hook from breaking automated pushes ([11e1113](https://github.com/auditmos/tstack-on-cf/commit/11e1113f773983342dcaa460703fcc2bfae46243))

## [1.5.4](https://github.com/auditmos/tstack-on-cf/compare/v1.5.3...v1.5.4) (2026-05-26)


### Bug Fixes

* **api:** route bare /api to Hono ([#13](https://github.com/auditmos/tstack-on-cf/issues/13)) ([757b9b5](https://github.com/auditmos/tstack-on-cf/commit/757b9b548eef08c19165340c8cdf0f1a4c2bac39))

## [1.5.3](https://github.com/auditmos/tstack-on-cf/compare/v1.5.2...v1.5.3) (2026-05-26)

## [1.5.2](https://github.com/auditmos/tstack-on-cf/compare/v1.5.1...v1.5.2) (2026-05-26)


### Bug Fixes

* **api:** remove dead CLOUDFLARE_ENV fallback in health endpoint ([#11](https://github.com/auditmos/tstack-on-cf/issues/11)) ([2962457](https://github.com/auditmos/tstack-on-cf/commit/2962457d40313ada0d67148d9cf71295cc806ac8))

## [1.5.1](https://github.com/auditmos/tstack-on-cf/compare/v1.5.0...v1.5.1) (2026-05-26)


### Bug Fixes

* **db:** log structured error when checkDatabase() fails ([#10](https://github.com/auditmos/tstack-on-cf/issues/10)) ([c070cec](https://github.com/auditmos/tstack-on-cf/commit/c070cec2074c5a6036a1b6bc3ee0bf6ad76d29ba))

# [1.5.0](https://github.com/auditmos/tstack-on-cf/compare/v1.4.1...v1.5.0) (2026-05-26)


### Features

* **deploy:** add env.staging/env.production wrangler blocks + deploy scripts ([#8](https://github.com/auditmos/tstack-on-cf/issues/8)) ([5570160](https://github.com/auditmos/tstack-on-cf/commit/5570160c4979ad81c7df0635ccf5b869346bc927))

## [1.4.1](https://github.com/auditmos/tstack-on-cf/compare/v1.4.0...v1.4.1) (2026-05-26)

# [1.4.0](https://github.com/auditmos/tstack-on-cf/compare/v1.3.0...v1.4.0) (2026-05-26)


### Features

* **api:** wire global Hono onError handler ([#9](https://github.com/auditmos/tstack-on-cf/issues/9)) ([2a8bd39](https://github.com/auditmos/tstack-on-cf/commit/2a8bd394fb8c18cd063b3b396c35552b053ef5ba))

# [1.3.0](https://github.com/auditmos/tstack-on-cf/compare/v1.2.1...v1.3.0) (2026-05-26)


### Features

* **cf:** enable Workers observability with sampling ([#7](https://github.com/auditmos/tstack-on-cf/issues/7)) ([805213e](https://github.com/auditmos/tstack-on-cf/commit/805213e8b013c24213d21d447d060766be95b2fa))

## [1.2.1](https://github.com/auditmos/tstack-on-cf/compare/v1.2.0...v1.2.1) (2026-05-25)


### Bug Fixes

* **security:** move DATABASE_* out of wrangler vars ([#5](https://github.com/auditmos/tstack-on-cf/issues/5)) ([da254b1](https://github.com/auditmos/tstack-on-cf/commit/da254b1302612643b2f770350f6094693e85f4b2))

# [1.2.0](https://github.com/auditmos/tstack-on-cf/compare/v1.1.0...v1.2.0) (2026-05-05)


### Features

* add init-project script for onboarding fresh clones ([82be9c8](https://github.com/auditmos/tstack-on-cf/commit/82be9c81ff03732b0655b0087139eb0b18d67b1c))

# [1.1.0](https://github.com/auditmos/tstack-on-cf/compare/v1.0.0...v1.1.0) (2026-04-09)


### Features

* add claude rules, agents, error infra, remove demo endpoint ([136b6a9](https://github.com/auditmos/tstack-on-cf/commit/136b6a90dda0c5ef70aa585161756803af0d70da))
* add clients CRUD UI, hooks, initial migration ([cc0e826](https://github.com/auditmos/tstack-on-cf/commit/cc0e8269163c5ef7ea82ed97cff4035b4444f7d7))
* add Neon PostgreSQL + Drizzle ORM database layer ([6de059a](https://github.com/auditmos/tstack-on-cf/commit/6de059a5483ade15f356ef6155e6967a5a20e376))

# 1.0.0 (2026-03-16)


### Bug Fixes

* specify packageManager for pnpm action-setup ([03ce86c](https://github.com/auditmos/tstack-on-cf/commit/03ce86ce7c313943d5bda304d036b8252d7ce08f))
