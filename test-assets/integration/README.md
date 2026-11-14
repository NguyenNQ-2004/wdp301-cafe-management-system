# AuraCafe Integration Test

32 positive workflow cases cover the 15 assigned business flows of Nguyen, Son, Duy, Ngoc and Manh. Each IT-BF ID matches the existing Excel workbook. The collection contains 133 requests, including setup and restoration. This is a prepared test suite, not an executed result.

## Files
- AuraCafe_Integration_E2E.postman_collection.json: executable Postman requests, token/ID chaining and assertions for saved business results.
- AuraCafe_Environment.sample.json: blank passwords and no real tokens.
- run_integration_suite.py: runs the collection through Newman and exports one JSON result for the run.
- ../results/AuraCafe_Integration-Test_Executed.xlsx: same 32 case IDs; all Pending until actually executed.

## Run in Postman
1. Start the backend against a separate, seeded test database with MongoDB transactions configured as required by this project. The suite creates QA accounts, stock, orders and financial records. Existing shop-rule values must be seeded. Use a single run without concurrent edits, before the local date changes.
2. Import the collection and environment. Set baseUrl, an existing adminEmail/adminPassword and qaPassword (8+ characters). Set isolatedTestEnvironment=true and allowTestWrites=true after selecting that test database.
3. Keep enableRecoveryTests=false. Keep enableGatewayTests=false unless the local mock gateway below is configured. Run the whole collection in its listed order. Do not sort the folders: staff, shifts, inventory and catalog must exist before ordering. The first request starts a fresh run and generates unique QA identities. Later requests save tokens and IDs automatically.
4. Successful core execution covers 29 cases. Two gateway cases are skipped without gateway setup; OTP is a separate manual case. Skipped requests are NOT Passed. Stop after any failed assertion; fix the prerequisite and start a fresh run. Do not continue dependent steps with old IDs.
5. Folder 98 restores the five original shop rules. If execution stops after changing those rules, run folder 98 manually using the same environment. Test fixture records remain in the test database for inspection.
6. Enter actual results in the existing workbook. Only mark a case Passed when every required step and business assertion has succeeded. Do not publish environment exports containing passwords or tokens.

## Two bank-transfer cases: IT-BF02-001 and IT-BF05-002
Use backend/scripts/mockPaymentGateway.js, which registers payments and signs callbacks; it does not transfer money. Configure the backend test environment with PAYMENT_GATEWAY_URL=http://127.0.0.1:5050, a matching PAYMENT_CALLBACK_SECRET of at least 16 characters, PAYMENT_BANK_ID, PAYMENT_ACCOUNT_NO and PAYMENT_ACCOUNT_NAME (sandbox values). Run the mock from the backend directory: node scripts/mockPaymentGateway.js. Both backend and mock must load the same secret, and MOCK_BACKEND_URL must point to your backend. Restart the backend after configuration. Set mockGatewayUrl=http://127.0.0.1:5050 and enableGatewayTests=true before the full run. A QR response alone is insufficient: the suite settles through the signed callback and reads payment SUCCESS, then completes the order.

## Manual live email OTP: IT-BF10-002
Run folder 99 separately, one request at a time. Set enableRecoveryTests=true, recoveryEmail to an existing account whose mailbox you can read (suggested: nguyen.nguyenquoc2004@gmail.com) and recoveryNewPassword to the chosen password. Request the email, read the actual OTP, enter recoveryOtp, then send verify, reset and login in sequence before expiry. This changes that account password. A 200 forgot-password response is intentionally generic and does not prove delivery. Leave Pending until the full sequence succeeds. Never run this folder unattended or include OTP/passwords in submitted evidence.

## Command line
Install Node.js and Newman 6 or later separately. The Python launcher requires Python 3. Set AURA_ADMIN_EMAIL, AURA_ADMIN_PASSWORD and AURA_QA_PASSWORD in your local process environment. After configuring the isolated database, run:

    python test-assets/integration/run_integration_suite.py --allow-test-writes

Add --gateway only after the mock is configured. The launcher never runs live password recovery. It fails on assertions rather than reporting a login-only run as complete. Results are written to test-assets/results/evidence/integration/integration-run-<timestamp>.json; keep only the result you submit. Result JSON can contain request/response data and JWTs: keep it local or redact secrets before sharing. --check validates file structure without sending requests. No screenshots are generated.

## Scope
These 32 cases cover successful integration journeys for the assigned 15 flows, not every possible requirement or error case. All execution fields remain Pending. System Test and original templates are unchanged by this update.

## Case-to-folder map
| Case | Workflow | Mode |
| --- | --- | --- |
| IT-BF10-001 | Register, sign in and save a profile | Core |
| IT-BF10-003 | Find the customer in CRM | Core |
| IT-BF15-001 | Create and sign in staff accounts | Core |
| IT-BF15-002 | Assign the weekly shift | Core |
| IT-BF06-001 | Admin marks staff present | Core |
| IT-BF06-002 | Read the attendance register | Core |
| IT-BF08-001 | Submit and approve a restock request | Core |
| IT-BF08-002 | Receive a purchase into stock | Core |
| IT-BF11-001 | Publish a drink and its options | Core |
| IT-BF11-002 | Save and read the drink recipe | Core |
| IT-BF11-003 | Check recipe and inventory cost inputs | Core |
| IT-BF14-001 | Save and read shop rules | Core |
| IT-BF14-002 | Publish a delivery district and fee | Core |
| IT-BF01-001 | Save a customized cart and create checkout | Core |
| IT-BF01-002 | Read the saved customer order | Core |
| IT-BF02-002 | Choose COD and confirm checkout | Core |
| IT-BF03-001 | Prepare and release a kitchen order | Core |
| IT-BF03-002 | Verify recipe stock deduction and captured cost | Core |
| IT-BF04-001 | Deliver the COD order and collect cash | Core |
| IT-BF12-001 | Verify earned points through phone lookup | Core |
| IT-BF12-002 | Redeem points on another order | Core |
| IT-BF05-001 | Pay and complete a dine-in cash order | Core |
| IT-BF04-002 | Remit and receive shipper COD cash | Core |
| IT-BF09-001 | Submit feedback for a completed order | Core |
| IT-BF09-002 | Admin replies and resolves feedback | Core |
| IT-BF02-001 | Pay an online order through the sandbox gateway | Local gateway required |
| IT-BF05-002 | Pay and complete a takeaway bank order | Local gateway required |
| IT-BF13-001 | Audit orders and matching payments | Core |
| IT-BF13-002 | Reconcile daily sales report | Core |
| IT-BF07-001 | Submit cashier shift handover | Core |
| IT-BF07-002 | Admin approves the handover | Core |
| IT-BF10-002 | Recover the password using a real email OTP | Manual live OTP |
