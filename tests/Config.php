<?php

namespace Tests;

class Config {
  public $config;
  public function __construct()
  {

      $config = file_get_contents(__DIR__ . '/../config.dev.json');
      $this->config = json_decode($config);
  }
}
