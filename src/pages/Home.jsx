export default function Home({ goNext }) {
  return (
    <div style={{ padding: 20 }}>
      <h1>Youth Bowling League</h1>
      <button onClick={goNext}>Enter System</button>
    </div>
  );
}