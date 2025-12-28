// Jobs Service (Supabase-backed)
// - Default jobs remain static (JM.DEFAULT_JOBS)
// - Posted jobs are stored in Supabase table: public.jobs

(function () {
  const JM = window.JM;

  // In-memory cache to keep existing pages synchronous.
  JM.state = JM.state || {};
  JM.state.remoteJobs = JM.state.remoteJobs || [];
  JM.state.remoteJobsLoaded = false;

  function mapRowToJob(row) {
    return {
      id: row.id,
      employer: row.employer,
      title: row.title,
      description: row.description,
      pay: row.pay,
      hoursPerWeek: row.hours_per_week,
      category: row.category,
      language: row.language,
      region: row.region,
      imageUrl: row.image_url,
      requirements: row.requirements || [],
      link: row.link,
      createdAt: row.created_at,
      featured: row.featured,
      ownerId: row.owner_id,
      updatedAt: row.updated_at,
    };
  }

  async function fetchRemoteJobs() {
    // Works for guests (public SELECT policy)
    const supabase = JM.supabase;
    if (!supabase) throw new Error("Supabase nicht initialisiert.");

    const { data, error } = await supabase
      .from("jobs")
      .select("id, employer, title, description, pay, hours_per_week, category, language, region, image_url, requirements, link, created_at, updated_at, featured, owner_id")
      .order("created_at", { ascending: false });

    if (error) throw error;
    JM.state.remoteJobs = (data || []).map(mapRowToJob);
    JM.state.remoteJobsLoaded = true;
    return JM.state.remoteJobs;
  }

  // Public API used by pages
  JM.loadAllJobs = () => {
    const remote = JM.state.remoteJobs || [];
    return [...(JM.DEFAULT_JOBS || []), ...remote];
  };

  JM.refreshRemoteJobs = async () => {
    const jobs = await fetchRemoteJobs();
    return jobs;
  };

  JM.ensureRemoteJobsLoaded = async () => {
    if (JM.state.remoteJobsLoaded) return JM.state.remoteJobs;
    return await fetchRemoteJobs();
  };

  // Owner helpers
  JM.getMyPostedJobs = () => {
    const u = JM.getCurrentUser?.();
    if (!u?.id) return [];
    return (JM.state.remoteJobs || []).filter(j => String(j.ownerId) === String(u.id));
  };

  // CRUD for entrepreneurs/admins
  JM.createJob = async (job) => {
    const supabase = JM.supabase;
    const u = JM.getCurrentUser?.();
    if (!u) throw new Error("Nicht eingeloggt.");

    const payload = {
      owner_id: u.id,
      employer: job.employer,
      title: job.title,
      description: job.description,
      pay: job.pay,
      hours_per_week: job.hoursPerWeek,
      category: job.category,
      language: job.language,
      region: job.region,
      image_url: job.imageUrl,
      requirements: job.requirements || [],
      link: job.link || "#",
      featured: !!job.featured,
    };

    const { data, error } = await supabase
      .from("jobs")
      .insert(payload)
      .select("id, employer, title, description, pay, hours_per_week, category, language, region, image_url, requirements, link, created_at, updated_at, featured, owner_id")
      .single();
    if (error) throw error;

    // refresh cache
    await JM.refreshRemoteJobs();
    return mapRowToJob(data);
  };

  JM.updateJob = async (jobId, patch) => {
    const supabase = JM.supabase;
    const payload = {
      employer: patch.employer,
      title: patch.title,
      description: patch.description,
      pay: patch.pay,
      hours_per_week: patch.hoursPerWeek,
      category: patch.category,
      language: patch.language,
      region: patch.region,
      image_url: patch.imageUrl,
      requirements: patch.requirements,
      link: patch.link,
      featured: patch.featured,
    };

    // Remove undefined keys (so we don't overwrite with null)
    Object.keys(payload).forEach(k => payload[k] === undefined && delete payload[k]);
    payload.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from("jobs")
      .update(payload)
      .eq("id", jobId)
      .select("id, employer, title, description, pay, hours_per_week, category, language, region, image_url, requirements, link, created_at, updated_at, featured, owner_id")
      .single();
    if (error) throw error;
    await JM.refreshRemoteJobs();
    return mapRowToJob(data);
  };

  JM.deleteJob = async (jobId) => {
    const supabase = JM.supabase;
    const { error } = await supabase.from("jobs").delete().eq("id", jobId);
    if (error) throw error;
    await JM.refreshRemoteJobs();
    return true;
  };
})();
