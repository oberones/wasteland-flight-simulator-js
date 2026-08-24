# Wasteland Flight Simulator Final Validation Report

- Generated: 2026-08-23T02:39:51.023Z
- Release status: **FAIL**
- Policy: missing, malformed, dirty, non-reference, blocked, or over-budget evidence fails closed

## Physical qualification matrix

| Reference      | Browser | Workload                 | Result  |
| -------------- | ------- | ------------------------ | ------- |
| desktop-m1     | Chrome  | flight-five-minute       | MISSING |
| desktop-m1     | Chrome  | maximum-speed-ten-minute | MISSING |
| desktop-m1     | Chrome  | restart-twenty           | MISSING |
| desktop-m1     | Safari  | flight-five-minute       | MISSING |
| desktop-m1     | Safari  | maximum-speed-ten-minute | MISSING |
| desktop-m1     | Safari  | restart-twenty           | MISSING |
| android-pixel7 | Chrome  | flight-five-minute       | MISSING |
| android-pixel7 | Chrome  | maximum-speed-ten-minute | MISSING |
| android-pixel7 | Chrome  | restart-twenty           | MISSING |
| ios-iphone13   | Safari  | flight-five-minute       | MISSING |
| ios-iphone13   | Safari  | maximum-speed-ten-minute | MISSING |
| ios-iphone13   | Safari  | restart-twenty           | MISSING |
| ios-iphone13   | Chrome  | flight-five-minute       | MISSING |
| ios-iphone13   | Chrome  | maximum-speed-ten-minute | MISSING |
| ios-iphone13   | Chrome  | restart-twenty           | MISSING |

## Requirement, security, accessibility, visual, and automated gates

| Gate                    | Evidence                                 | Result  |
| ----------------------- | ---------------------------------------- | ------- |
| Dependency manifest     | `evidence/dependency-manifest.json`      | PRESENT |
| Dependency review       | `evidence/security/dependency-review.md` | PRESENT |
| Static checks           | `evidence/validation/static-checks.md`   | PRESENT |
| Automated tests         | `evidence/validation/automated-tests.md` | PRESENT |
| Runtime security review | `evidence/security/runtime-review.md`    | PRESENT |
| Accessibility review    | `evidence/accessibility/us4-review.md`   | FAIL    |
| Final visual review     | `evidence/visual/final-review.md`        | PRESENT |
| Quickstart validation   | `evidence/validation/quickstart.md`      | FAIL    |

## Missing or failed gates

- evidence/environment-manifest.json is missing
- desktop-m1 Chrome flight-five-minute qualification is missing
- desktop-m1 Chrome maximum-speed-ten-minute qualification is missing
- desktop-m1 Chrome restart-twenty qualification is missing
- desktop-m1 Safari flight-five-minute qualification is missing
- desktop-m1 Safari maximum-speed-ten-minute qualification is missing
- desktop-m1 Safari restart-twenty qualification is missing
- android-pixel7 Chrome flight-five-minute qualification is missing
- android-pixel7 Chrome maximum-speed-ten-minute qualification is missing
- android-pixel7 Chrome restart-twenty qualification is missing
- ios-iphone13 Safari flight-five-minute qualification is missing
- ios-iphone13 Safari maximum-speed-ten-minute qualification is missing
- ios-iphone13 Safari restart-twenty qualification is missing
- ios-iphone13 Chrome flight-five-minute qualification is missing
- ios-iphone13 Chrome maximum-speed-ten-minute qualification is missing
- ios-iphone13 Chrome restart-twenty qualification is missing
- evidence/accessibility/us4-review.md records a blocked or failed gate
- evidence/validation/quickstart.md records a blocked or failed gate

## Conclusion

The release candidate is not qualified for release. Resolve every item above and regenerate this report.
