<template lang="pug">
.tm-session-wrapper
  img.tm-session-backdrop(src="~assets/images/cosmos-logo.png")
  session-loading(v-if="config.modals.session.state == 'loading'")
  session-welcome(v-if="config.modals.session.state == 'welcome'")
  session-sign-up(v-if="config.modals.session.state == 'sign-up'")
  session-sign-in(v-if="config.modals.session.state == 'sign-in'")
  session-account-delete(v-if="config.modals.session.state == 'delete'")
  session-hardware(v-if="config.modals.session.state == 'hardware'")
  session-import(v-if="config.modals.session.state == 'import'")
</template>

<script>
import { mapGetters } from "vuex"
import SessionLoading from "common/TmSessionLoading"
import SessionWelcome from "common/TmSessionWelcome"
import SessionSignUp from "common/TmSessionSignUp"
import SessionSignIn from "common/TmSessionSignIn"
import SessionHardware from "common/TmSessionHardware"
import SessionImport from "common/TmSessionImport"
import SessionAccountDelete from "common/TmSessionAccountDelete"
export default {
  name: "tm-session",
  components: {
    SessionLoading,
    SessionWelcome,
    SessionSignUp,
    SessionSignIn,
    SessionHardware,
    SessionImport,
    SessionAccountDelete
  },
  computed: { ...mapGetters(["config"]) }
}
</script>

<style lang="stylus">
@import '~variables'

.tm-session-wrapper
  position relative
  z-index z(modal)

  .tm-session-backdrop
    position absolute
    top -10vw
    left -10vw
    width 50vw
    opacity 0.25

.tm-field-checkbox
  display flex
  flex-flow row nowrap
  align-items center

  .tm-field-checkbox-input
    flex 0 0 2rem
    height 2rem
    display flex
    align-items center
    justify-content center
    background var(--app-fg)
    input
      width auto
      display block
      padding 0
      margin 0

  .tm-field-checkbox-label
    flex 1
    line-height 1.375
    padding 0.5rem 1rem
    font-size 0.875rem

.tm-session
  position fixed
  top 0
  left 0
  z-index z(default)
  background var(--app-fg)

.tm-session-container
  &:not(.tm-form)
    width 100vw
    height 100vh
    display flex
    flex-flow column nowrap

  &.tm-form
    .tm-form-main
      width 100vw
      height 100vh
      display flex
      flex-flow column nowrap

.tm-session-header
  display flex
  justify-content space-between
  align-items center
  margin-top 1.5rem // for macos traffic signals
  padding 1rem 2rem;
  border-bottom: 0.125rem solid var(--bc-dim);

  a
    display flex
    align-items center
    justify-content center
    cursor pointer
    i
      color var(--dim)
      font-size lg
    &:hover
      i
        color var(--txt)

  .tm-session-title
    flex 1
    padding 0 1rem
    font-size xl
    text-align center
    color var(--txt)

.tm-session-main
  min-height 0
  background var(--app-fg)
  overflow-y auto
  position relative

  .tm-bar-discrete
    margin 1rem auto

  img
    margin 0 auto
    max-width 300px
    display block

  .ps-scrollbar-y-rail
    display none

  > p
    padding 1rem
    border-bottom px solid var(--bc)

.tm-session-label
  padding 1rem
  background var(--app-fg)
  color var(--txt)
  text-align center

.tm-session-footer
  background var(--app-fg)
  flex 0 0 5rem + px
  padding 0 2rem
  display flex
  align-items center
  justify-content flex-end

  button
    margin-left 1rem

  &:empty
    display none

.tm-form-group__label
  color var(--dim)
  font-size sm
  line-height xl

.tm-session-footer > div
  display flex
  justify-content space-between

@media screen and (min-width: 768px)
  .tm-session-wrapper
    position fixed
    top 0
    left 0
    background var(--app-bg)
    width 100vw
    height 100vh

    display flex
    align-items center
    justify-content center

  .tm-session
    position static
    shadow()

  .tm-session-container
    &:not(.tm-form)
    &.tm-form .tm-form-main
      width 32rem
      max-height 100vh
      height auto

  .tm-session-header
    background var(--app-nav)
    margin-top 0

  .tm-session-main
    padding 3rem 1rem

    .tm-form-group
      display block !important
</style>
