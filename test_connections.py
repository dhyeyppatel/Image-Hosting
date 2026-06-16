import asyncio
import os
import sys
from dotenv import load_dotenv

# Load environment variables from .env
load_dotenv()

async def test_mongodb():
    print("Testing MongoDB Connection...")
    mongo_uri = os.getenv("MONGO_URI")
    if not mongo_uri:
        print("❌ MONGO_URI is not set in .env file!")
        return False
    try:
        from motor.motor_asyncio import AsyncIOMotorClient
        client = AsyncIOMotorClient(mongo_uri)
        # Ping the server to test connection
        await client.admin.command('ping')
        print("   ✅ MongoDB connection successful!")
        return True
    except Exception as e:
        print(f"   ❌ MongoDB connection failed: {e}")
        return False

async def test_telegram():
    print("Testing Telegram Bot & Channel Access...")
    bot_token = os.getenv("BOT_TOKEN")
    channel_id = os.getenv("STORAGE_CHANNEL_ID")
    if not bot_token or not channel_id:
        print("❌ BOT_TOKEN or STORAGE_CHANNEL_ID is not set in .env file!")
        return False
    try:
        import httpx
        url = f"https://api.telegram.org/bot{bot_token}/getChat"
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(url, json={"chat_id": channel_id})
            result = resp.json()
            if result.get("ok"):
                chat_title = result["result"].get("title", "Private Channel/Chat")
                print(f"   ✅ Telegram connection successful! Access verified for: '{chat_title}'")
                return True
            else:
                print(f"   ❌ Telegram API Error: {result.get('description')}")
                return False
    except Exception as e:
        print(f"   ❌ Telegram connection failed: {e}")
        return False

async def main():
    print("=== Dhyey Space Setup Verification ===\n")
    if not os.path.exists(".env"):
        print("❌ .env file not found! Please copy .env.example to .env and fill in details first.")
        sys.exit(1)
        
    db_ok = await test_mongodb()
    tg_ok = await test_telegram()
    
    print("\n======================================")
    if db_ok and tg_ok:
        print("🎉 All systems green! Start the local server with:")
        print("   uvicorn app.main:app --reload --port 8000")
    else:
        print("⚠️ Some checks failed. Please fix the credentials in your .env file.")

if __name__ == "__main__":
    asyncio.run(main())
