import nodeFetch from 'node-fetch';
const fetch = nodeFetch as unknown as typeof global.fetch;

interface UpgradeUser {
    id: string;
    email: string;
    drive_token?: string;
    state: string;
}

interface UpgradeFolder {
    id: string;
    name: string;
    drive_folder_id: string;
    status: string;
    web_view_link?: string;
}

interface VectoriaFolderInfo {
    id: string;
    name: string;
    drive_folder_id: string;
    status: string;
    web_view_link?: string;
    has_embeddings?: boolean;
}

interface VectoriaStatus {
    status: string;
    total_documents?: number;
    processed_documents?: number;
    failed_documents?: number;
    processing_records?: any[];
}

interface UpgradeFoldersResponse {
    success: boolean;
    folders: UpgradeFolder[];
    error?: string;
}

// Configuration
const config = {
    upgrade: {
        url: process.env.UPGRADE_API_URL || 'http://0.0.0.0:8000',
        email: 'matt@mattmarcus.net',
        test_folder_id: '1h4yphfHDE9KRtGZP5MEbeXCUATkbHgQW'
    },
    chat: {
        url: process.env.CHAT_URL || 'http://localhost:3000',
    },
    vectoria: {
        url: process.env.VECTORIA_URL || 'http://0.0.0.0:8001'
    }
};

async function testFlow() {
    console.log('=== Starting Test Flow ===\n');

    try {
        // Step 1: Sign in to UpGrade and get token
        console.log('1. Signing in to UpGrade...');
        const signInResponse = await fetch(`${config.upgrade.url}/api/auth/debug`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: config.upgrade.email
            })
        });

        if (!signInResponse.ok) {
            throw new Error(`UpGrade sign in failed: ${signInResponse.status}`);
        }

        const { token } = await signInResponse.json() as { token: string };
        console.log('✓ Got UpGrade token\n');

        // Step 2: Verify token with UpGrade
        console.log('2. Verifying token with UpGrade...');
        const verifyResponse = await fetch(`${config.upgrade.url}/api/user/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!verifyResponse.ok) {
            throw new Error(`Token verification failed: ${verifyResponse.status}`);
        }

        const userData = await verifyResponse.json() as UpgradeUser;
        console.log('✓ Token verified, got user data:', userData, '\n');

        // Step 3: Get user's folders from UpGrade
        console.log('3. Getting folders from UpGrade...');
        const foldersResponse = await fetch(`${config.upgrade.url}/api/folders`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!foldersResponse.ok) {
            throw new Error(`Failed to get folders: ${foldersResponse.status}`);
        }

        const foldersData = await foldersResponse.json() as UpgradeFoldersResponse;
        if (!foldersData.success) {
            throw new Error('Failed to get folders: ' + foldersData.error);
        }

        const folders = foldersData.folders;
        const testFolder = folders.find(f => f.drive_folder_id === config.upgrade.test_folder_id);
        if (!testFolder) {
            throw new Error('Test folder not found');
        }
        console.log('✓ Got test folder:', testFolder, '\n');

        // Step 4: Get folder info from Vectoria
        console.log('4. Getting folder info from Vectoria...');
        const folderInfoResponse = await fetch(
            `${config.vectoria.url}/api/folder/${testFolder.drive_folder_id}`,
            {
                headers: { 'Authorization': `Bearer ${token}` }
            }
        );

        if (!folderInfoResponse.ok) {
            throw new Error(`Failed to get folder info: ${folderInfoResponse.status}`);
        }

        const folderInfo = await folderInfoResponse.json() as VectoriaFolderInfo;
        console.log('✓ Got folder info from Vectoria:', folderInfo, '\n');

        // Step 5: Get vectorization status
        console.log('5. Getting vectorization status...');
        const statusResponse = await fetch(
            `${config.vectoria.url}/api/folder/${testFolder.drive_folder_id}/status`,
            {
                headers: { 'Authorization': `Bearer ${token}` }
            }
        );

        if (!statusResponse.ok) {
            throw new Error(`Failed to get vectorization status: ${statusResponse.status}`);
        }

        const statusInfo = await statusResponse.json() as VectoriaStatus;
        console.log('✓ Got vectorization status:', statusInfo, '\n');

        // Step 6: Test chat endpoint
        console.log('6. Testing chat endpoint...');
        if (!userData.drive_token) {
            throw new Error('No drive token found in user data');
        }
        const chatResponse = await fetch(`${config.vectoria.url}/api/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                folder_id: testFolder.drive_folder_id,
                query: 'What files are in this folder?',
                user_id: userData.id,
                user_creds: JSON.parse(userData.drive_token)
            })
        });

        if (!chatResponse.ok) {
            const errorText = await chatResponse.text();
            throw new Error(`Chat request failed: ${chatResponse.status} - ${errorText}`);
        }

        const chatResult = await chatResponse.json();
        console.log('✓ Got chat response:', chatResult, '\n');

        console.log('=== Test Flow Completed Successfully ===');

    } catch (error) {
        console.error('\n❌ Test failed:', error);
        process.exit(1);
    }
}

// Run the test
testFlow(); 