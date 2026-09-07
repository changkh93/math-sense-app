import React from 'react';

// A failed lazy section must not replace the already-visible profile.
export default class ProfileSectionBoundary extends React.Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (this.state.failed) {
      return <p className="public-profile-section-status" role="status">상장 화면을 열지 못했습니다. 나중에 다시 방문해주세요.</p>;
    }
    return this.props.children;
  }
}
