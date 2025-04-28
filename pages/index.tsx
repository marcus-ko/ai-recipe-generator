import { useState } from 'react';

export default function Home() {
  const [ingredients, setIngredients] = useState('');
  const [generateImage, setGenerateImage] = useState(false);
  const [loading, setLoading] = useState(false);
  const [recipe, setRecipe] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setRecipe('');
    setImageUrl('');
    setError('');

    try {
      // Get recipe from ChatGPT
      const recipeRes = await fetch('/api/recipe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ingredients }),
      });

      const recipeData = await recipeRes.json();
      if (!recipeRes.ok) throw new Error(recipeData.error || 'Recipe generation failed');

      const resultText = recipeData.result;
      setRecipe(resultText);

      // If checkbox is checked, generate image
      if (generateImage) {
        const titleMatch = resultText.match(/^(.+?)\n/); // Get first line as title
        const imagePrompt = titleMatch ? titleMatch[1].trim() : `A dish made with ${ingredients}`;
        console.log("Image Prompt: ", imagePrompt);
        const imageRes = await fetch('/api/generateImage', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: imagePrompt }),
        });

        const imageData = await imageRes.json();
        if (!imageRes.ok) throw new Error(imageData.error || 'Image generation failed');

        setImageUrl(imageData.imageUrl);
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unknown error occurred.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={{ padding: '2rem', maxWidth: '600px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <h1>AI Recipe Generator 🍽️</h1>
      <img src="/images/food-banner.jpg" alt="food dishes" className="banner-image" width="400px" height="auto"/>
      <form onSubmit={handleSubmit}>
        <label htmlFor="ingredients">Enter ingredients (comma-separated):</label>
        <input
          id="ingredients"
          type="text"
          value={ingredients}
          onChange={(e) => setIngredients(e.target.value)}
          placeholder="e.g. chicken, broccoli, garlic"
          style={{ width: '100%', padding: '8px', margin: '10px 0' }}
          required
        />

        <label style={{ display: 'block', margin: '10px 0' }}>
          <input
            type="checkbox"
            checked={generateImage}
            onChange={(e) => setGenerateImage(e.target.checked)}
          />{' '}
          Generate Image of Dish (uses tokens)
        </label>

        <button type="submit" disabled={loading} style={{ padding: '10px 15px' }}>
          {loading ? 'Generating...' : 'Get Recipes'}
        </button>
      </form>

      {error && <p style={{ color: 'red', marginTop: '1rem' }}>{error}</p>}

      {imageUrl && (
        <div style={{ marginTop: '2rem' }}>
          <h3>Generated Dish Image:</h3>
          <img
            src={imageUrl}
            alt="Generated dish preview"
            style={{ width: '100%', maxWidth: '400px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
          />
        </div>
      )}

      {recipe && (
        <div style={{ marginTop: '2rem', whiteSpace: 'pre-wrap' }}>
          <h2>Recipe:</h2>
          <p>{recipe}</p>
        </div>
      )}

     
    </main>
  );
}
