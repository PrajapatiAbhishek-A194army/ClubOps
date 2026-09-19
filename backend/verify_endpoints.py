import urllib.request
import json

def test():
    req = urllib.request.Request(
        'http://127.0.0.1:8000/api/v1/auth/login',
        data=json.dumps({'email': 'president@clubops.ai', 'password': 'ClubOps2026!'}).encode(),
        headers={'Content-Type': 'application/json'}
    )
    with urllib.request.urlopen(req) as resp:
        token = json.loads(resp.read().decode())['data']['access_token']

    headers = {'Authorization': f'Bearer {token}'}

    def test_ep(name, path):
        try:
            r = urllib.request.Request(f'http://127.0.0.1:8000/api/v1{path}', headers=headers)
            with urllib.request.urlopen(r) as resp:
                data = json.loads(resp.read().decode())
                val = data.get('data')
                count = len(val) if isinstance(val, list) else (1 if val else 0)
                print(f"[{name}] SUCCESS (Status {resp.status}) - items: {count}")
        except Exception as e:
            print(f"[{name}] FAILED: {e}")

    r = urllib.request.Request('http://127.0.0.1:8000/api/v1/clubs', headers=headers)
    with urllib.request.urlopen(r) as resp:
        club_id = json.loads(resp.read().decode())['data'][0]['id']

    test_ep('Auth Me', '/auth/me')
    test_ep('Clubs', '/clubs')
    test_ep('Club Members', f'/clubs/{club_id}/members')
    test_ep('Events', f'/clubs/{club_id}/events')
    test_ep('Tasks', f'/clubs/{club_id}/tasks')
    test_ep('Volunteers', f'/clubs/{club_id}/volunteers')
    test_ep('Meetings', f'/meetings?club_id={club_id}')
    test_ep('Risks', f'/risks?club_id={club_id}')
    test_ep('Knowledge Docs', f'/knowledge/documents?club_id={club_id}')
    test_ep('Notifications', '/notifications?limit=20')

if __name__ == '__main__':
    test()
