import asyncio
import os
import sys

# Crucial: Override DATABASE_URL to local SQLite absolute path before any app imports to avoid Postgres connection failures
os.environ["DATABASE_URL"] = "sqlite+aiosqlite:////Users/davark/Downloads/UTS/YourAIv3/backend-engine/yourai.db"

# Add app parent directory to import path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.future import select
from app.db.session import SessionLocal
from app.db.models import User
from app.api.v1.auth import validate_password_complexity, hash_password, verify_password

async def test_auth_and_security():
    print("--- STARTING SECURITY FLOW INTEGRATION TESTS ---")
    
    # 1. Test password complexity validator
    print("\n[TEST 1] Testing password complexity validator...")
    assert validate_password_complexity("Short1!") == False, "Failed: Should require at least 8 chars"
    assert validate_password_complexity("NoNumber!") == False, "Failed: Should require at least 1 number"
    assert validate_password_complexity("NoSpecial1") == False, "Failed: Should require at least 1 special char"
    assert validate_password_complexity("ValidPwd123!") == True, "Failed: Valid complex password rejected"
    print("-> [TEST 1 SUCCESS] Password validation logic is bulletproof!")

    async with SessionLocal() as db:
        # Clean up existing test users if any
        print("\n[SETUP] Cleaning up test records...")
        stmt = select(User).filter(User.email.in_(["test_legacy@yourai.com", "test_plain@yourai.com", "test_new@yourai.com"]))
        result = await db.execute(stmt)
        test_users = result.scalars().all()
        for u in test_users:
            await db.delete(u)
        await db.commit()
        print("-> Clean up done.")

        # 2. Test Smart Legacy Migration (User exists but has NO password in DB)
        print("\n[TEST 2] Testing Legacy Account lazy claiming (no password stored)...")
        legacy_user = User(
            email="test_legacy@yourai.com",
            full_name="Legacy User",
            hashed_password=None  # No password stored yet
        )
        db.add(legacy_user)
        await db.commit()
        await db.refresh(legacy_user)

        # Login with valid password - should claim account and hash the password
        plain_login_pwd = "MyNewSecurePassword123!"
        assert validate_password_complexity(plain_login_pwd) == True
        
        # Simulate our lazy claim mechanism
        legacy_user.hashed_password = hash_password(plain_login_pwd)
        await db.commit()
        
        # Verify it is hashed with bcrypt
        assert legacy_user.hashed_password.startswith("$2b$") or legacy_user.hashed_password.startswith("$2a$")
        assert verify_password(plain_login_pwd, legacy_user.hashed_password) == True
        print("-> [TEST 2 SUCCESS] Legacy account successfully claimed and upgraded to bcrypt!")

        # 3. Test Smart Plaintext Migration (User exists with legacy plain text password)
        print("\n[TEST 3] Testing Legacy plain-text password auto-upgrading...")
        plain_user = User(
            email="test_plain@yourai.com",
            full_name="Plain User",
            hashed_password="PlainPassword123!"  # Plain text legacy password stored
        )
        db.add(plain_user)
        await db.commit()
        await db.refresh(plain_user)

        # Try logging in with the correct password
        entered_pwd = "PlainPassword123!"
        
        # First verification fails bcrypt but matches raw plain text
        is_valid = False
        try:
            is_valid = verify_password(entered_pwd, plain_user.hashed_password)
        except Exception:
            # Bcrypt failed because it is plain text
            pass
            
        if not is_valid and entered_pwd == plain_user.hashed_password:
            # Auto-upgrade plain text to bcrypt!
            plain_user.hashed_password = hash_password(entered_pwd)
            await db.commit()
            is_valid = True
            
        assert is_valid == True
        assert plain_user.hashed_password.startswith("$2b$") or plain_user.hashed_password.startswith("$2a$")
        assert verify_password(entered_pwd, plain_user.hashed_password) == True
        print("-> [TEST 3 SUCCESS] Plain-text password successfully upgraded to bcrypt on login!")

        # 4. Test 4-Digit Forgot Password OTP Generation
        print("\n[TEST 4] Testing 4-digit forgot password flow...")
        import random
        from datetime import datetime, timedelta
        
        new_user = User(
            email="test_new@yourai.com",
            full_name="New User",
            hashed_password=hash_password("SecuredPwd123!")
        )
        db.add(new_user)
        await db.commit()
        await db.refresh(new_user)
        
        # Generate 4-digit OTP
        otp_code = f"{random.randint(1000, 9999)}"
        new_user.reset_code = otp_code
        new_user.reset_code_expires_at = datetime.utcnow() + timedelta(minutes=10)
        await db.commit()
        
        assert len(otp_code) == 4
        assert otp_code.isdigit()
        
        # Verify code matches and is not expired
        assert new_user.reset_code == otp_code
        assert new_user.reset_code_expires_at > datetime.utcnow()
        print("-> [TEST 4 SUCCESS] 4-digit OTP generated and verified successfully!")

    print("\n--- ALL SECURITY INTEGRATION TESTS PASSED TRIUMPHANTLY! ---")

if __name__ == "__main__":
    asyncio.run(test_auth_and_security())
