export default function AdminPage() {
  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
        Welcome back,{" "}
        <span className="text-neon drop-shadow-neon-sm">Admin</span>
      </h1>
      <p className="text-sm text-muted-foreground">
        Manage fighters, events, and fights from the sidebar.
      </p>
    </div>
  );
}
