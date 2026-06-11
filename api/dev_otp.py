"""Dev helper: print a 6-digit sign-in code without sending an email.

Supabase's built-in SMTP allows only a couple of emails per hour, which
stalls local testing. This uses the service-role admin API to generate the
same OTP the email would contain. Enter the printed code on the app's
verify screen.

Usage (from api/, venv active):
    python dev_otp.py you@example.com

NEVER deploy or expose this — it mints sign-in codes for any account.
"""

import os
import sys

from dotenv import load_dotenv
from supabase import create_client

load_dotenv()


def main() -> None:
    if len(sys.argv) != 2:
        print("usage: python dev_otp.py <email>", file=sys.stderr)
        raise SystemExit(2)
    email = sys.argv[1].strip().lower()

    client = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SECRET_KEY"])
    admin = client.auth.admin

    try:
        link = admin.generate_link({"type": "magiclink", "email": email})
    except Exception:
        # User doesn't exist yet — create it confirmed, then retry.
        admin.create_user({"email": email, "email_confirm": True})
        link = admin.generate_link({"type": "magiclink", "email": email})

    otp = link.properties.email_otp
    print(f"\nSign-in code for {email}: {otp}\n")
    print("Enter it on the app's verify screen. Generating a new code")
    print("(here or via 'Send code' in the app) invalidates this one.")


if __name__ == "__main__":
    main()
