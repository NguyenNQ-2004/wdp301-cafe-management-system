"""Run the actual Postman suite through Newman; never embeds credentials."""
import argparse
import datetime
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true', help='Validate files only; send no requests')
    parser.add_argument('--allow-test-writes', action='store_true', help='Confirm a separate seeded test database is selected')
    parser.add_argument('--gateway', action='store_true', help='Include the two local signed-callback gateway cases')
    args = parser.parse_args()
    folder = Path(__file__).resolve().parent
    collection = folder / 'AuraCafe_Integration_E2E.postman_collection.json'
    environment = json.loads((folder / 'AuraCafe_Environment.sample.json').read_text(encoding='utf-8'))
    data = json.loads(collection.read_text(encoding='utf-8'))
    cases = [f for f in data['item'] if 'IT-BF' in f['name']]
    requests = sum(len(f['item']) for f in data['item'])
    if len(cases) != 32 or requests != 133:
        parser.error('Expected 32 cases and 133 requests')
    if args.check:
        print('Structure OK: 32 cases / 133 requests. No requests sent; no test results claimed.')
        return 0
    if not args.allow_test_writes:
        parser.error('Select a separate seeded test database, then pass --allow-test-writes')
    required = {'adminEmail': 'AURA_ADMIN_EMAIL', 'adminPassword': 'AURA_ADMIN_PASSWORD', 'qaPassword': 'AURA_QA_PASSWORD'}
    if any(not os.environ.get(key) for key in required.values()):
        parser.error('Set AURA_ADMIN_EMAIL, AURA_ADMIN_PASSWORD and AURA_QA_PASSWORD locally')
    newman = shutil.which('newman')
    if not newman:
        parser.error('Newman 6+ is required; install it or run through Postman')
    overrides = {key: os.environ[value] for key, value in required.items()}
    overrides.update(baseUrl=os.environ.get('AURA_BASE_URL', 'http://localhost:5000'), isolatedTestEnvironment='true', allowTestWrites='true', enableGatewayTests='true' if args.gateway else 'false', enableRecoveryTests='false')
    for entry in environment['values']:
        if entry['key'] in overrides:
            entry['value'] = overrides[entry['key']]
    output = folder.parent / 'results' / 'evidence' / 'integration'
    output.mkdir(parents=True, exist_ok=True)
    stamp = datetime.datetime.now().strftime('%Y%m%d-%H%M%S-%f')
    report = output / ('integration-run-' + stamp + '.json')
    # The temporary environment is removed even when Newman fails.
    with tempfile.TemporaryDirectory(prefix='aura-integration-') as tmp:
        env_file = Path(tmp) / 'environment.json'
        env_file.write_text(json.dumps(environment), encoding='utf-8')
        command = [newman, 'run', str(collection), '-e', str(env_file), '--bail', 'failure', '-r', 'cli,json', '--reporter-json-export', str(report)]
        # Windows resolves Newman as a .cmd shim; call its installed JS entry directly.
        if os.name == 'nt' and newman.lower().endswith('.cmd'):
            cli = Path(newman).parent / 'node_modules' / 'newman' / 'bin' / 'newman.js'
            node = shutil.which('node')
            if not node or not cli.is_file():
                parser.error('Cannot resolve Newman JS entry; run the collection in Postman')
            command = [node, str(cli)] + command[1:]
        result = subprocess.run(command, check=False)
    print('Result file:', report)
    print('OTP remains manual/Pending. Gateway cases require --gateway. Never count skipped cases as Passed.')
    return result.returncode

if __name__ == '__main__':
    raise SystemExit(main())
