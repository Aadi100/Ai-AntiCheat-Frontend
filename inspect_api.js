async function run() {
  try {
    const path = 'camera_clips/server_recognize/crops/crop_20260721_111252_456817_0.jpg';
    
    // Test URL paths WITHOUT Authorization header
    const url1 = `http://127.0.0.1:5050/media/${path}`;
    const url2 = `http://127.0.0.1:5050/${path}`;
    
    console.log('Testing URL 1 (with /media/) WITHOUT Auth:', url1);
    const res1 = await fetch(url1, { method: 'HEAD' });
    console.log('URL 1 Response Status:', res1.status);
    
    console.log('\nTesting URL 2 (direct /camera_clips/) WITHOUT Auth:', url2);
    const res2 = await fetch(url2, { method: 'HEAD' });
    console.log('URL 2 Response Status:', res2.status);
  } catch (err) {
    console.error('Error running test:', err);
  }
}

run();
