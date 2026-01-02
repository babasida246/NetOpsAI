// Simple test script for Clean Architecture endpoints
const BASE_URL = 'http://localhost:3000';

async function testRegister() {
    console.log('\n=== Testing Register Endpoint ===\n');

    const tests = [
        {
            name: 'Success case',
            body: {
                email: 'test@example.com',
                username: 'testuser',
                password: 'SecurePass123'
            }
        },
        {
            name: 'Duplicate email',
            body: {
                email: 'test@example.com',
                username: 'testuser2',
                password: 'SecurePass123'
            }
        },
        {
            name: 'Duplicate username',
            body: {
                email: 'test2@example.com',
                username: 'testuser',
                password: 'SecurePass123'
            }
        },
        {
            name: 'Invalid email',
            body: {
                email: 'invalidemail',
                username: 'testuser3',
                password: 'SecurePass123'
            }
        },
        {
            name: 'Weak password',
            body: {
                email: 'test4@example.com',
                username: 'testuser4',
                password: '123'
            }
        },
        {
            name: 'Missing fields',
            body: {
                email: 'test5@example.com'
            }
        }
    ];

    for (const test of tests) {
        try {
            const response = await fetch(`${BASE_URL}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(test.body)
            });

            const data = await response.text();
            console.log(`[${test.name}]`);
            console.log(`  Status: ${response.status}`);
            console.log(`  Response: ${data}\n`);
        } catch (error) {
            console.log(`[${test.name}] ERROR: ${error.message}\n`);
        }
    }
}

async function testLogin(email, password) {
    console.log('\n=== Testing Login Endpoint ===\n');

    const tests = [
        {
            name: 'Success case',
            body: { email, password }
        },
        {
            name: 'Wrong password',
            body: { email, password: 'WrongPassword' }
        },
        {
            name: 'User not found',
            body: { email: 'nonexistent@example.com', password }
        },
        {
            name: 'Invalid email format',
            body: { email: 'invalidemail', password }
        },
        {
            name: 'Missing password',
            body: { email }
        }
    ];

    let accessToken = null;
    let refreshToken = null;

    for (const test of tests) {
        try {
            const response = await fetch(`${BASE_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(test.body)
            });

            const data = await response.text();
            console.log(`[${test.name}]`);
            console.log(`  Status: ${response.status}`);
            console.log(`  Response: ${data}\n`);

            // Save tokens from successful login
            if (response.ok && test.name === 'Success case') {
                try {
                    const jsonData = JSON.parse(data);
                    accessToken = jsonData.data?.accessToken;
                    refreshToken = jsonData.data?.refreshToken;
                } catch (e) {
                    // Ignore JSON parse errors
                }
            }
        } catch (error) {
            console.log(`[${test.name}] ERROR: ${error.message}\n`);
        }
    }

    return { accessToken, refreshToken };
}

async function testRefreshAndLogout(accessToken, refreshToken) {
    console.log('\n=== Testing Refresh Token Endpoint ===\n');

    // Test refresh with valid token
    try {
        const response = await fetch(`${BASE_URL}/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken })
        });

        const data = await response.text();
        console.log('[Valid refresh token]');
        console.log(`  Status: ${response.status}`);
        console.log(`  Response: ${data}\n`);
    } catch (error) {
        console.log(`[Valid refresh token] ERROR: ${error.message}\n`);
    }

    // Test refresh with invalid token
    try {
        const response = await fetch(`${BASE_URL}/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken: 'invalid_token_xyz' })
        });

        const data = await response.text();
        console.log('[Invalid refresh token]');
        console.log(`  Status: ${response.status}`);
        console.log(`  Response: ${data}\n`);
    } catch (error) {
        console.log(`[Invalid refresh token] ERROR: ${error.message}\n`);
    }

    console.log('\n=== Testing Logout Endpoint ===\n');

    // Test logout with valid token
    try {
        const response = await fetch(`${BASE_URL}/auth/logout`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
            },
            body: '{}'
        });

        const data = await response.text();
        console.log('[Logout with valid token]');
        console.log(`  Status: ${response.status}`);
        console.log(`  Response: ${data}\n`);
    } catch (error) {
        console.log(`[Logout with valid token] ERROR: ${error.message}\n`);
    }

    // Test logout without auth header
    try {
        const response = await fetch(`${BASE_URL}/auth/logout`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: '{}'
        });

        const data = await response.text();
        console.log('[Logout without auth header]');
        console.log(`  Status: ${response.status}`);
        console.log(`  Response: ${data}\n`);
    } catch (error) {
        console.log(`[Logout without auth header] ERROR: ${error.message}\n`);
    }
}

async function testConversations(accessToken) {
    console.log('\n=== Testing Conversations Endpoints ===\n');

    let conversationId = null;

    // Create conversation - success
    try {
        const response = await fetch(`${BASE_URL}/conversations`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify({ title: 'Test Conversation' })
        });

        const data = await response.text();
        console.log('[Create conversation - Success]');
        console.log(`  Status: ${response.status}`);
        console.log(`  Response: ${data}\n`);

        if (response.ok) {
            try {
                const jsonData = JSON.parse(data);
                conversationId = jsonData.data?.id;
            } catch (e) {
                // Ignore
            }
        }
    } catch (error) {
        console.log(`[Create conversation - Success] ERROR: ${error.message}\n`);
    }

    // Create conversation - missing title
    try {
        const response = await fetch(`${BASE_URL}/conversations`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
            },
            body: '{}'
        });

        const data = await response.text();
        console.log('[Create conversation - Missing title]');
        console.log(`  Status: ${response.status}`);
        console.log(`  Response: ${data}\n`);
    } catch (error) {
        console.log(`[Create conversation - Missing title] ERROR: ${error.message}\n`);
    }

    // List conversations
    try {
        const response = await fetch(`${BASE_URL}/conversations?page=1&pageSize=10`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });

        const data = await response.text();
        console.log('[List conversations]');
        console.log(`  Status: ${response.status}`);
        console.log(`  Response: ${data}\n`);
    } catch (error) {
        console.log(`[List conversations] ERROR: ${error.message}\n`);
    }

    if (conversationId) {
        // Get conversation by ID
        try {
            const response = await fetch(`${BASE_URL}/conversations/${conversationId}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            });

            const data = await response.text();
            console.log('[Get conversation by ID]');
            console.log(`  Status: ${response.status}`);
            console.log(`  Response: ${data}\n`);
        } catch (error) {
            console.log(`[Get conversation by ID] ERROR: ${error.message}\n`);
        }

        // Update conversation
        try {
            const response = await fetch(`${BASE_URL}/conversations/${conversationId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`
                },
                body: JSON.stringify({ title: 'Updated Title' })
            });

            const data = await response.text();
            console.log('[Update conversation]');
            console.log(`  Status: ${response.status}`);
            console.log(`  Response: ${data}\n`);
        } catch (error) {
            console.log(`[Update conversation] ERROR: ${error.message}\n`);
        }
    }

    // Get conversation - not found
    try {
        const response = await fetch(`${BASE_URL}/conversations/00000000-0000-0000-0000-000000000000`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });

        const data = await response.text();
        console.log('[Get conversation - Not found]');
        console.log(`  Status: ${response.status}`);
        console.log(`  Response: ${data}\n`);
    } catch (error) {
        console.log(`[Get conversation - Not found] ERROR: ${error.message}\n`);
    }

    return conversationId;
}

async function testMessages(accessToken, conversationId) {
    console.log('\n=== Testing Messages Endpoints ===\n');

    if (!conversationId) {
        console.log('No conversation ID available, skipping messages tests\n');
        return;
    }

    // Send message - success
    try {
        const response = await fetch(`${BASE_URL}/conversations/${conversationId}/messages`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify({
                content: 'Hello, this is a test message',
                role: 'user'
            })
        });

        const data = await response.text();
        console.log('[Send message - Success]');
        console.log(`  Status: ${response.status}`);
        console.log(`  Response: ${data}\n`);
    } catch (error) {
        console.log(`[Send message - Success] ERROR: ${error.message}\n`);
    }

    // Get messages
    try {
        const response = await fetch(`${BASE_URL}/conversations/${conversationId}/messages`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });

        const data = await response.text();
        console.log('[Get messages]');
        console.log(`  Status: ${response.status}`);
        console.log(`  Response: ${data}\n`);
    } catch (error) {
        console.log(`[Get messages] ERROR: ${error.message}\n`);
    }

    // Send message - invalid conversation
    try {
        const response = await fetch(`${BASE_URL}/conversations/00000000-0000-0000-0000-000000000000/messages`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify({
                content: 'Test message',
                role: 'user'
            })
        });

        const data = await response.text();
        console.log('[Send message - Invalid conversation]');
        console.log(`  Status: ${response.status}`);
        console.log(`  Response: ${data}\n`);
    } catch (error) {
        console.log(`[Send message - Invalid conversation] ERROR: ${error.message}\n`);
    }
}

// Run all tests
async function main() {
    console.log('===================================');
    console.log('  Clean Architecture API Tests');
    console.log('===================================');

    await testRegister();

    const { accessToken, refreshToken } = await testLogin('test@example.com', 'SecurePass123');

    if (accessToken && refreshToken) {
        await testRefreshAndLogout(accessToken, refreshToken);

        // Get new tokens since logout invalidated the old ones
        const { accessToken: newAccessToken } = await testLogin('test@example.com', 'SecurePass123');

        if (newAccessToken) {
            const conversationId = await testConversations(newAccessToken);
            await testMessages(newAccessToken, conversationId);
        }
    }

    console.log('\n===================================');
    console.log('  All tests completed!');
    console.log('===================================\n');
}

main().catch(console.error);
