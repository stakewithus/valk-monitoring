job "blockchain-client" {
  datacenters = ["dc1"]
  meta {
    node-project = "blockchain-client"
  }
  group "commit-hub" {
    count = 1
    constraint {
      attribute = "${meta.region}"
      operator  = "set_contains"
      value     = "ap-southeast-1"
    }
    task "maind" {
      meta {
        node-project-category = "tendermint"
        node-project-name     = "commit-hub"
      }
      driver = "docker"
      config = {
        image = "socat-app:develop"
        args = ["-v","tcp-l:8181,fork","exec:\"/app/echo\""]
        mounts = [
          {
            type = "bind"
            target = "/app"
            source = "/opt/hashistack/app"
          }
        ]
        port_map = {
          socat_sock = 8181
          http_p2p = 46656
          http_rpc = 46657
          http_abci = 46658
        }
        network_mode = "host"
      }
      resources = {
        cpu = 300
        memory = 256
        network {
          port "socat_sock" { static = "8181" }
          port "http_p2p" { static = "46656" }
          port "http_rpc" { static = "46657" }
          port "http_abci" { static = "46658" }
        }
      }
    }
  }
}
