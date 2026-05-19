export default function ProfileSelect({ goFrontDesk }) {
  return (
    <div style={{ padding: 20 }}>
      <h2>Select Profile</h2>

      <button onClick={goFrontDesk}>Front Desk</button>

      <button disabled>Lane Assistant (Coming Soon)</button>
    </div>
  );
}