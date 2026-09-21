  const openAccept = (task: Task) => {
    if (!isAuthenticated()) return navigate('/login')
    if (isProfileIncomplete()) return navigate('/user/profile')
    if (!canAcceptTasks()) return
    setTermsAccepted(false)
    setClaimError('')
    setClaimModal(task)
  }

  const accept = async () => {
    if (!claimModal || !termsAccepted) return
    setClaimLoading(true)
    setClaimError('')
    try {
      const name = `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.name || ''
      const contact = user?.phoneNumber || user?.contact || ''
      const res = await tasksApi.claim(claimModal.taskId, name, contact, true)

      if (res.data?.success !== true || res.data?.data !== true) {
        setClaimError(res.data?.message || 'This task could not be accepted.')
        await load(page, search, category)
        return
      }

      const acceptedId = claimModal.taskId
      setClaimModal(null)
      setTasks(prev => prev.filter(t => t.taskId !== acceptedId))
      navigate('/tasks/my-active', { state: { acceptedTaskId: acceptedId } })
    } catch (err: any) {
      setClaimError(err.response?.data?.message || 'This task is no longer available. Please refresh and try again.')
      await load(page, search, category)
    } finally {
      setClaimLoading(false)
    }
  }
  const buttonText = () => {
    if (!isAuthenticated()) return 'Sign in'
    if (isProfileIncomplete()) return 'Complete profile'
    if (!canAcceptTasks()) return 'Not available'
    return 'Accept task'
  }

  return (
    <div className="browse-page">
      <div className="page-header"><div className="container"><h1><i className="fas fa-search" /> Find a Task</h1><p>Choose a task that fits your skills and schedule. Completed work is paid directly to your verified bank account.</p></div></div>

      <div className="container browse-content">