// Simple test for compression functionality
const testData = {
  consoleLogs: Array(50).fill().map((_, i) => ({
    type: i % 10 === 0 ? 'error' : i % 5 === 0 ? 'warn' : 'log',
    message: `This is a very detailed log message ${i} with lots of information about the application state, user interactions, and various debugging details that would typically be found in a production environment. The message includes timestamps, object data, and other contextual information that developers need to reproduce and fix bugs.`,
    timestamp: new Date().toISOString()
  })),
  networkRequests: Array(20).fill().map((_, i) => ({
    name: `https://api.example.com/endpoint-${i}/data?param1=value1&param2=value2&param3=value3`,
    duration: Math.random() * 1000,
    size: Math.random() * 10000,
    type: i % 3 === 0 ? 'fetch' : 'xhr'
  }))
};

// Test compression
async function testCompression() {
  try {
    console.log('Original data size:', JSON.stringify(testData).length, 'bytes');

    // Simulate browser compression
    const jsonString = JSON.stringify(testData);

    if (typeof CompressionStream !== 'undefined') {
      const stream = new CompressionStream('gzip');
      const writer = stream.writable.getWriter();
      const reader = stream.readable.getReader();

      writer.write(new TextEncoder().encode(jsonString));
      writer.close();

      const chunks = [];
      let done = false;
      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) chunks.push(value);
      }

      const compressed = new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0));
      let offset = 0;
      for (const chunk of chunks) {
        compressed.set(chunk, offset);
        offset += chunk.length;
      }

      const base64 = btoa(String.fromCharCode(...compressed));
      console.log('Compressed size:', base64.length, 'bytes');
      console.log('Compression ratio:', ((jsonString.length - base64.length) / jsonString.length * 100).toFixed(1) + '%');

      return base64;
    } else {
      console.log('CompressionStream not available');
      return null;
    }
  } catch (error) {
    console.error('Compression test failed:', error);
    return null;
  }
}

// Test API submission
async function testAPISubmission() {
  console.log('Testing API submission with compression...');

  const compressedData = await testCompression();

  if (!compressedData) {
    console.log('Compression not available, testing without compression');
    return;
  }

  const formData = new FormData();
  formData.append('project_key', 'qqa6gF2deJypP3VKEYODxu31yQLaygYz');
  formData.append('type', 'bug');
  formData.append('title', 'Compression Test Report');
  formData.append('description', 'Testing large diagnostic data compression');
  formData.append('diagnostic_data_compressed', compressedData);
  formData.append('compression_type', 'gzip');
  formData.append('reporter_name', 'Test User');
  formData.append('reporter_email', 'test@example.com');

  try {
    const response = await fetch('/api/widget/submit', {
      method: 'POST',
      body: formData
    });

    console.log('API Response Status:', response.status);
    const result = await response.text();
    console.log('API Response:', result);

    if (response.ok) {
      console.log('✅ Compression test passed!');
    } else {
      console.log('❌ API submission failed');
    }
  } catch (error) {
    console.error('API submission error:', error);
  }
}

// Run tests
testAPISubmission();